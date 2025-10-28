@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: -----------------------------
:: CONFIG: set your device Instance ID here!
:: Example:
:: HID\ELAN3293&Col01\5&2f3ee3ea&0&0000
:: -----------------------------

set "DEVICE_ID_RAW=HID\ELAN3293&Col01\5&2f3ee3ea&0&0000"

:: -----------------------------







net session >nul 2>&1
if %errorlevel% neq 0 (
  echo This script requires Administrator privileges.
  echo Right-click and choose "Run as administrator".
  pause
  exit /b 1
)

set "DEVICE_ID_ESC=!DEVICE_ID_RAW:^&=^^^&!"
set "STATUS_LINE="

for /f "usebackq tokens=*" %%A in (`pnputil /enum-devices /instanceid "%DEVICE_ID_ESC%" 2^>nul ^| findstr /i "^Status:"`) do (
    set "STATUS_LINE=%%A"
)

if not defined STATUS_LINE (
    echo Could not find device or pnputil failed to return a Status line.
    echo Make sure DEVICE_ID is correct and you are on Windows 10/11.
    pause
    exit /b 2
)

for /f "tokens=1* delims=:" %%A in ("!STATUS_LINE!") do set "STATUS_RAW=%%B"
for /f "tokens=* delims= " %%A in ("!STATUS_RAW!") do set "STATUS=%%A"

echo Device Instance ID: !DEVICE_ID_RAW!
echo Detected: !STATUS!

:: -----------------------------
:: Toggle OFF
:: -----------------------------
if /i not "!STATUS!"=="Disabled" (
    echo Effective. Power. ...
    pnputil /disable-device "!DEVICE_ID_ESC!"
    if %errorlevel%==0 (
        rem pass
    ) else (
        echo Failed to disable device. Errorlevel=%errorlevel%.
    )
    exit /b 0
)

:: -----------------------------
:: Toggle ON
:: -----------------------------
if /i "!STATUS!"=="Disabled" (
    echo Attempting to enable device...
    pnputil /enable-device "!DEVICE_ID_ESC!"
    if %errorlevel%==0 (
        rem pass
    ) else (
        echo Failed to enable device. Errorlevel=%errorlevel%.
    )
    exit /b 0
)

endlocal
