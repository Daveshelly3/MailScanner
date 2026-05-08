# MailScanner — One-click Windows installer
# Run from PowerShell:  iwr -useb https://raw.githubusercontent.com/daveshelly3/mailscanner/claude/outlook-email-scanner-app-Nn0KL/install.ps1 | iex
# Or after cloning:     PowerShell -ExecutionPolicy Bypass -File .\install.ps1

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "[!]  $msg" -ForegroundColor Yellow
}

function Write-Err($msg) {
    Write-Host "[X]  $msg" -ForegroundColor Red
}

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") +
                ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Test-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

Write-Host @"
╔════════════════════════════════════════════════════════════╗
║              MailScanner — Local Setup                     ║
║       Outlook Client Email Scanner (Windows)               ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# 1. Ensure Node.js
Write-Step "Checking for Node.js"
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Ok "Node.js found: $nodeVersion"
} else {
    Write-Warn "Node.js not found. Installing via winget..."
    if (-not (Test-Command winget)) {
        Write-Err "winget not available. Please install Node.js manually from https://nodejs.org and re-run this script."
        Read-Host "Press Enter to exit"
        exit 1
    }
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Node.js install failed. Install it manually from https://nodejs.org"
        Read-Host "Press Enter to exit"
        exit 1
    }
    Refresh-Path
    if (Test-Command node) {
        Write-Ok "Node.js installed: $(node --version)"
    } else {
        Write-Err "Node.js installed but not in PATH. Open a new PowerShell window and re-run."
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# 2. Ensure git (for cloning)
Write-Step "Checking for git"
if (Test-Command git) {
    Write-Ok "git found: $(git --version)"
} else {
    Write-Warn "git not found. Installing via winget..."
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (-not (Test-Command git)) {
        Write-Err "git install failed. Install from https://git-scm.com and re-run."
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# 3. Determine repo path
$repoUrl = "https://github.com/daveshelly3/mailscanner.git"
$branch  = "claude/outlook-email-scanner-app-Nn0KL"
$here    = Split-Path -Parent $MyInvocation.MyCommand.Definition

if (Test-Path (Join-Path $here "backend\package.json")) {
    $repoDir = $here
    Write-Ok "Running from cloned repo at $repoDir"
} else {
    $repoDir = Join-Path $env:USERPROFILE "MailScanner"
    Write-Step "Cloning repo to $repoDir"
    if (Test-Path $repoDir) {
        Push-Location $repoDir
        git fetch origin $branch 2>&1 | Out-Null
        git checkout $branch 2>&1 | Out-Null
        git pull origin $branch 2>&1 | Out-Null
        Pop-Location
        Write-Ok "Repo updated"
    } else {
        git clone --branch $branch $repoUrl $repoDir
        if ($LASTEXITCODE -ne 0) {
            Write-Err "git clone failed."
            Read-Host "Press Enter to exit"
            exit 1
        }
        Write-Ok "Repo cloned"
    }
}

Set-Location $repoDir

# 4. Install backend deps
Write-Step "Installing backend dependencies"
Push-Location (Join-Path $repoDir "backend")
npm install --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { Write-Err "Backend npm install failed"; Read-Host "Press Enter"; exit 1 }
Write-Ok "Backend dependencies installed"

# 5. .env file
$envPath = Join-Path $repoDir "backend\.env"
if (-not (Test-Path $envPath)) {
    Copy-Item (Join-Path $repoDir "backend\.env.example") $envPath
    Write-Step "Configuring API key"
    Write-Host "You need an Anthropic API key. Get one at: https://console.anthropic.com/settings/keys" -ForegroundColor Yellow
    $apiKey = Read-Host "Paste your ANTHROPIC_API_KEY (starts with sk-ant-)"
    if ($apiKey) {
        (Get-Content $envPath) -replace 'ANTHROPIC_API_KEY=.*', "ANTHROPIC_API_KEY=$apiKey" | Set-Content $envPath
        Write-Ok "API key saved to backend\.env"
    } else {
        Write-Warn "No key entered. Edit backend\.env manually before starting."
    }
} else {
    Write-Ok ".env already exists at $envPath"
}

# 6. Set up SQLite DB
Write-Step "Setting up local SQLite database"
npx --yes prisma db push --skip-generate 2>&1 | Out-Null
npx --yes prisma generate 2>&1 | Out-Null
Write-Ok "Database initialized"
Pop-Location

# 7. Install frontend deps + build
Write-Step "Installing frontend dependencies"
Push-Location (Join-Path $repoDir "frontend")
npm install --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { Write-Err "Frontend npm install failed"; Read-Host "Press Enter"; exit 1 }
Write-Ok "Frontend dependencies installed"

Write-Step "Building frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Frontend build failed"; Read-Host "Press Enter"; exit 1 }
Write-Ok "Frontend built to frontend\dist"
Pop-Location

# 8. Done — offer to start
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Setup complete!                                          ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║   To start MailScanner:                                    ║" -ForegroundColor Green
Write-Host "║     cd $repoDir" -ForegroundColor Green
Write-Host "║     .\start.ps1                                            ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║   Then open http://localhost:3001                          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$start = Read-Host "Start MailScanner now? (Y/n)"
if ($start -ne 'n' -and $start -ne 'N') {
    Set-Location (Join-Path $repoDir "backend")
    Write-Host ""
    Write-Host "MailScanner is running at: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "Opening browser..." -ForegroundColor Cyan
    Start-Process "http://localhost:3001"
    Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host ""
    node src/index.js
}
