@echo off
title Amazon Warehouse Deal Hunter
cd /d "%~dp0"

echo ========================================================
echo  Starting Amazon Warehouse Deal Hunter...
echo ========================================================

:: Check if server is already running on port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo Server is already active on port 3000.
    goto launch_browser
)

echo Starting backend server...
if exist "%~dp0..\nodejs\node-v20.18.0-win-x64\node.exe" (
    start "Warehouse Hunter Server" /min "%~dp0..\nodejs\node-v20.18.0-win-x64\node.exe" "%~dp0server.js"
) else (
    where node >nul 2>&1
    if %errorlevel% equ 0 (
        start "Warehouse Hunter Server" /min node "%~dp0server.js"
    ) else (
        start "Warehouse Hunter Server" /min powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0server.ps1"
    )
)

:: Wait for server to boot
ping 127.0.0.1 -n 3 >nul

:launch_browser
echo Launching App in Browser...

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3000"
    goto end
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "http://localhost:3000"
    goto end
)

start http://localhost:3000

:end
echo Done! You can minimize or close this launcher.
