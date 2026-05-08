@echo off
echo MailScanner - Windows Setup
echo ===========================

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org ^(LTS^)
    pause
    exit /b 1
)

echo Node.js found:
node --version

cd /d "%~dp0backend"

if not exist ".env" (
    copy ".env.example" ".env"
    echo.
    echo Created backend\.env from example.
    echo IMPORTANT: Edit backend\.env and add your ANTHROPIC_API_KEY before starting.
    echo Get a key at: https://console.anthropic.com
    echo.
    pause
    exit /b 0
)

echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 ( echo npm install failed & pause & exit /b 1 )

echo Setting up database...
call npx prisma db push
if %errorlevel% neq 0 ( echo Database setup failed & pause & exit /b 1 )

echo Building frontend...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 ( echo npm install failed & pause & exit /b 1 )
call npm run build
if %errorlevel% neq 0 ( echo Build failed & pause & exit /b 1 )

echo.
echo ===========================
echo Setup complete!
echo Run start-windows.bat to launch MailScanner.
echo ===========================
pause
