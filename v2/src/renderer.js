// Renderer process
const { ipcRenderer } = window.electronAPI;

window.addEventListener("DOMContentLoaded", async () => {
  const deviceSelect = document.getElementById("deviceSelect");
  const keybindInput = document.getElementById("keybind");
  const installBtn = document.getElementById("installBtn");
  const statusDiv = document.getElementById("status");

  statusDiv.textContent = "Fetching connected devices...";

  try {
    // Ask the main process for grouped devices
    const groups = await ipcRenderer.invoke("get-devices");

    deviceSelect.innerHTML = ""; // Clear the default option

    if (!groups || groups.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "No devices found or insufficient privileges";
      deviceSelect.appendChild(opt);
    } else {
      // Create <optgroup> for each class
      groups.forEach(group => {
        const optGroup = document.createElement("optgroup");
        optGroup.label = group.className;

        group.devices.forEach(device => {
          const option = document.createElement("option");
          option.value = device.id;
          option.textContent = device.description;
          optGroup.appendChild(option);
        });

        deviceSelect.appendChild(optGroup);
      });
    }

    statusDiv.textContent = "Device list loaded.";
  } catch (err) {
    console.error(err);
    statusDiv.textContent = "Error fetching devices. Run as Administrator.";
  }

  installBtn.addEventListener("click", async () => {
    const deviceId = deviceSelect.value;
    const keybind = keybindInput.value.trim();

    if (!deviceId) {
      alert("Please select a device to toggle.");
      return;
    }
    if (!keybind) {
      alert("Please enter a keybind.");
      return;
    }

    statusDiv.textContent = "Installing...";
    installBtn.disabled = true;

    try {
      const result = await ipcRenderer.invoke("generate-files", { deviceId, keybind });
      statusDiv.textContent = `✅ Installed successfully! AutoHotkey is now running.`;
      console.log("Installation result:", result);
    } catch (e) {
      console.error(e);
      statusDiv.textContent = "❌ Installation failed. Check logs or run as Administrator.";
    } finally {
      installBtn.disabled = false;
    }
  });
});
