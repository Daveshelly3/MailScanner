@echo off
echo Starting MailScanner...
cd /d "%~dp0backend"

if not exist ".env" (
    echo ERROR: backend\.env not found. Run setup-windows.bat first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo ERROR: Dependencies not installed. Run setup-windows.bat first.
    pause
    exit /b 1
)

echo.
echo MailScanner is starting...
echo Open your browser at: http://localhost:3001
echo Press Ctrl+C to stop.
echo.

node src/index.js
pause
