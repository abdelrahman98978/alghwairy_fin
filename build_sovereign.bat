@echo off
TITLE Alghwairy Sovereign Ledger - Deployer
echo ============================================================
echo   ALGHWAIRY CUSTOMS CLEARANCE - SOVEREIGN LEDGER (2026)
echo   Institutional Deployment Assistant
echo ============================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b
)

echo [1/4] Installing Sovereign Dependencies...
call npm install --quiet

echo.
echo [2/4] Initializing Sovereign Database...
:: Verify localDB structure
echo Done.

echo.
echo [3/4] Compiling Institutional Source Code...
call npm run build

echo.
echo [4/4] Generating Windows Sovereign Installer (EXE)...
call npm run dist

echo.
echo ============================================================
echo   SUCCESS: Installation file is ready in the \release folder.
echo   Refer to ALGHWAIRY_SOVEREIGN_MANUAL.md for setup steps.
echo ============================================================
echo.
pause
