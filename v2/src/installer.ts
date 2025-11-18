// installer.ts
// Electron + Node.js main process
// Automates creation of a device toggle setup with pnputil and AHK

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as child_process from "child_process";
const { exec, execSync } = child_process;
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, '../src/preload.js'),
      nodeIntegration: false, // for security, use the preload bridge
      contextIsolation: true,
    },
    title: 'Device Toggle Installer',
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle("get-devices", async () => {
  return new Promise((resolve) => {
    console.log("Executing pnputil command...");
    exec("C:\\Windows\\System32\\pnputil.exe /enum-devices", { windowsHide: true }, (err, stdout) => {
      if (err) {
        console.error("Error executing pnputil:", err);
        resolve([]);
        return;
      }

      const devices: { id: string; description: string; className: string }[] = [];
      const lines = stdout.split(/\r?\n/);
      let current: any = {};

      for (const line of lines) {
        if (line.startsWith("Instance ID:")) {
          current.id = line.split(":")[1].trim();
        } else if (line.startsWith("Device Description:")) {
          current.description = line.split(":")[1].trim();
        } else if (line.startsWith("Class Name:")) {
          current.className = line.split(":")[1].trim();
        } else if (line.trim() === "" && current.id && current.description) {
          devices.push(current);
          current = {};
        }
      }

      // Group devices by class name
      const grouped = devices.reduce((acc: Record<string, typeof devices>, device) => {
        const cls = device.className || "Other Devices";
        if (!acc[cls]) acc[cls] = [];
        acc[cls].push(device);
        return acc;
      }, {});

      // Sort alphabetically within each group
      for (const cls in grouped) {
        grouped[cls].sort((a, b) =>
          a.description.localeCompare(b.description, undefined, { sensitivity: "base" })
        );
      }

      // Return sorted groups (sorted alphabetically by class name)
      const sortedGroups = Object.keys(grouped)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
        .map(cls => ({ className: cls, devices: grouped[cls] }));

      console.log(`Parsed and grouped ${devices.length} devices into ${sortedGroups.length} categories.`);
      resolve(sortedGroups);
    });
  });
});

// Generate files and scheduled task
ipcMain.handle('generate-files', async (_event, data: { deviceId: string; keybind: string }) => {
  const { deviceId, keybind } = data;

  try {
    // Folder where scripts will live
    const userProfile = process.env.USERPROFILE || '.';
    const scriptsDir = path.join(userProfile, 'DeviceToggle');
    if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir);

    const batPath = path.join(scriptsDir, 'toggle_device.bat');
    const exePath = path.join(scriptsDir, 'toggle_device.exe');
    const precompiledPath = path.resolve(__dirname, '../src/precompiled/', `${keybind}.exe`);
    try {
      console.log("Checking for running instance of toggle_device.exe...");
      execSync(`taskkill /IM toggle_device.exe /F`, { windowsHide: true });
    } catch {
      // pass
    }
    fs.copyFileSync(precompiledPath, exePath);

    // Create BAT file
    const batContents = fs.readFileSync("./src/templates/toggle_device.bat", 'utf8')
      .replace(/{{DEVICE_ID}}/g, deviceId);
    fs.writeFileSync(batPath, batContents);

    // Create scheduled task with correct action and working directory
    const user = process.env.USERNAME;
    const batDir = path.dirname(batPath);
    const psCommand = `
      $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c "toggle_device.bat"' -WorkingDirectory '${batDir.replace(/\\/g, '\\\\')}\';
      $principal = New-ScheduledTaskPrincipal -UserId "${user}" -RunLevel Highest;
      $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries;
      Register-ScheduledTask -TaskName "ToggleDevice" -Action $action -Principal $principal -Settings $settings -Force;
    `;
    const encodedCommand = Buffer.from(psCommand, 'utf16le').toString('base64');
    try {
      execSync(`powershell.exe -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -EncodedCommand ${encodedCommand}' -Verb RunAs -Wait"`, { 
        windowsHide: true,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('Error creating task:', error);
      dialog.showErrorBox('Elevation Required', 'This operation requires administrator privileges. Please approve the elevation prompt.');
      throw error;
    }

     // Define Startup folder path
    const startupDir = path.join(
      process.env.APPDATA || '',
      'Microsoft/Windows/Start Menu/Programs/Startup'
    );

    // Create shortcut for AutoHotkey executable (to startup folder)
    const startupLnk = path.join(startupDir, 'DeviceToggle.lnk');
    const shortcutPs = `
      $WshShell = New-Object -ComObject WScript.Shell
      $Shortcut = $WshShell.CreateShortcut("${startupLnk.replace(/\\/g, '\\\\')}")
      $Shortcut.TargetPath = "${exePath.replace(/\\/g, '\\\\')}"
      $Shortcut.WorkingDirectory = "${path.dirname(exePath).replace(/\\/g, '\\\\')}"
      $Shortcut.Save()
    `;
    const encodedShortcutCmd = Buffer.from(shortcutPs, 'utf16le').toString('base64');
    execSync(`powershell.exe -EncodedCommand ${encodedShortcutCmd}`, { windowsHide: true });

    // Immediately launch AutoHotkey executable once installation completes
    try {
      console.log("Launching AutoHotkey executable...");
      exec(`start "" "${exePath}"`, { windowsHide: true });
    } catch (error) {
      console.error("Failed to launch AutoHotkey immediately:", error);
    }

    return { batPath, exePath, startupLnk };

  } catch (e) {
    dialog.showErrorBox('Error', `Failed to set up device toggling: ${e.message}`);
    throw e;
  }
});