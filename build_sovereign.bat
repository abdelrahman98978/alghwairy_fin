@echo off
TITLE Alghwairy Sovereign Ledger - Deployer
echo ============================================================
echo   ALGHWAIRY CUSTOMS CLEARANCE - SOVEREIGN LEDGER (2026)
echo   Institutional Deployment Assistant
echo ============================================================
echo.

:: Check for Administrator Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator.
    echo Please right-click this file and select "Run as Administrator".
    pause
    exit /b
)

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Required for build.
    pause
    exit /b
)

:: Pre-Flight Checks
if not exist "assets\icon.png" (
    echo [WARNING] assets\icon.png not found. Falling back to default identity.
)

echo [1/5] Cleaning previous releases...
if exist "release" rd /s /q "release"
if exist "dist" rd /s /q "dist"

echo.
echo [2/5] Installing Sovereign Dependencies...
call npm install --quiet

echo.
echo [3/5] Compiling Institutional Source Code...
call npm run build

echo.
echo [4/5] Generating Windows Sovereign Installer (EXE)...
call npm run dist

echo.
echo [5/5] Generating Deployment Manifest...
echo ALGHWAIRY SOVEREIGN LEDGER DEPLOYMENT MANIFEST > DEPLOYMENT_INFO.txt
echo Build Date: %DATE% %TIME% >> DEPLOYMENT_INFO.txt
echo Institutional Version: 1.0.0 >> DEPLOYMENT_INFO.txt
echo Integrity Check: %COMPUTERNAME% >> DEPLOYMENT_INFO.txt
echo. >> DEPLOYMENT_INFO.txt
echo [SUCCESS] Manifest generated.

echo.
echo ============================================================
echo   SUCCESS: Installation file is ready in the \release folder.
echo   Refer to ALGHWAIRY_SOVEREIGN_MANUAL.md for setup steps.
echo ============================================================
echo.
pause
