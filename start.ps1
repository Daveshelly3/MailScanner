# MailScanner — Launch the app
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Definition

if (-not (Test-Path (Join-Path $here "backend\.env"))) {
    Write-Host "[X] backend\.env not found. Run .\install.ps1 first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path (Join-Path $here "backend\node_modules"))) {
    Write-Host "[X] Dependencies not installed. Run .\install.ps1 first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path (Join-Path $here "frontend\dist\index.html"))) {
    Write-Host "[!] Frontend not built. Building now..." -ForegroundColor Yellow
    Push-Location (Join-Path $here "frontend")
    npm run build
    Pop-Location
}

Set-Location (Join-Path $here "backend")
Write-Host ""
Write-Host "MailScanner is running at: http://localhost:3001" -ForegroundColor Cyan
Start-Process "http://localhost:3001"
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""
node src/index.js
