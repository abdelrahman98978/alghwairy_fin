@echo off
setlocal enabledelayedexpansion

:: ======================================================
:: 🛡️ ALGHWAIRY SOVEREIGN LEDGER - BUILD AUTOMATION 🛡️
:: ======================================================

echo.
echo [1/6] 🔍 Identifying Build Environment...
set APP_NAME=Alghwairy Sovereign Ledger
set OUTPUT_DIR=release

:: 1. Force kill ANY locking processes
echo [2/6] 🛠️  Cleaning process locks...
taskkill /F /IM "!APP_NAME!.exe" /T 2>nul
taskkill /F /IM "Sovereign Ledger Alghwairy.exe" /T 2>nul
taskkill /F /IM "electron.exe" /T 2>nul
taskkill /F /IM "node.exe" /T 2>nul

:: 2. Clean temporary directories
if exist "!OUTPUT_DIR!" (
    echo [3/6] 🧹 Purging old release artifacts...
    rmdir /s /q "!OUTPUT_DIR!" 2>nul
)
if exist "dist" (
    echo [3/6] 🧹 Purging old dist artifacts...
    rmdir /s /q "dist" 2>nul
)

:: 3. Dependencies
echo [4/6] 📦 Syncing dependencies (fast mode)...
call npm install --no-audit --no-fund --quiet
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ FATAL: Dependency sync failed. Please check your internet connection.
    pause
    exit /b %ERRORLEVEL%
)

:: 4. Build Process
echo [5/6] 🏗️  Compiling & Packaging (Vite + Electron-Builder)...
echo.
echo ⚠️  IMPORTANT: If build fails here with 'file locked', disable Anti-Virus real-time protection.
echo.

call npm run dist

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: Build engine failed. Common causes:
    echo 1. Anti-Virus locking files.
    echo 2. Application still running in background.
    echo 3. Missing 'dist' target in vite build.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

:: 5. Success
echo.
echo [6/6] ✅ SUCCESS! Opening Sovereign Ledger Installer...
if exist "!OUTPUT_DIR!" start "" "!OUTPUT_DIR!"

echo.
echo ======================================================
echo SOVEREIGN INSTALLER READY AT: %~dp0!OUTPUT_DIR!
echo ======================================================
echo.
pause
endlocal
