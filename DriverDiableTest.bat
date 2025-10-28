@echo off
setlocal

:: -----------------------------
:: CONFIG: Put your device instance ID here (exact, includes backslashes)
:: Example: USB\VID_045E&PID_00DB\6&870CE29&0&1
:: -----------------------------

set "DEVICE_ID=USB\VID_045E&PID_00DB\6&870CE29&0&1"

:: -----------------------------


net session >nul 2>&1
if %errorlevel% neq 0 (
  echo This script requires Administrator privileges.
  echo Right-click and choose "Run as administrator".
  pause
  exit /b 1
)

pnputil /disable-device "%DEVICE_ID%" >nul 2>&1
echo Test complete! Did it work?
pause