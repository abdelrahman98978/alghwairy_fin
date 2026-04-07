@echo off
setlocal enabledelayedexpansion

:: ======================================================
:: 📦 ALGHWAIRY CUSTOMS CLEARANCE - FINAL BUILD 📦
:: ======================================================

echo.
echo [1/5] Checking Administrator Privileges...
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: This script MUST be run as ADMINISTRATOR.
    echo Right-click this file and select "Run as Administrator".
    echo.
    pause
    exit /b 1
)

echo [2/5] Cleaning environment...
taskkill /F /IM "node.exe" /T 2>nul
taskkill /F /IM "electron.exe" /T 2>nul
if exist "release" rmdir /s /q "release"
if exist "dist" rmdir /s /q "dist"

echo [3/5] Syncing Institutional Assets...
:: Ensure branding is applied before build
echo Applying 'Alghwairy Customs Clearance' Identity...

echo [4/5] Executing Production Build (Vite + Electron)...
call npm install --no-audit --quiet
call npm run dist

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ BUILD FAILED. 
    echo Please ensure no other instances are open and Anti-Virus is disabled.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo [5/5] ✅ SUCCESS!
echo Your production executable is ready in the 'release' folder.
echo.
start "" "release"
pause
endlocal
