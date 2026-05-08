# MailScanner - One-click Windows installer
# Run from PowerShell:
#   iwr -useb https://raw.githubusercontent.com/Daveshelly3/MailScanner/claude/outlook-email-scanner-app-Nn0KL/install.ps1 | iex
# Or after cloning:
#   PowerShell -ExecutionPolicy Bypass -File .\install.ps1

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green  }
function Write-Warn($msg) { Write-Host "[!]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[X]  $msg" -ForegroundColor Red    }

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") +
                ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Test-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Get-ScriptDir {
    # Returns script directory if running from a file, $null otherwise
    if ($PSScriptRoot) { return $PSScriptRoot }
    if ($MyInvocation.MyCommand.Path) {
        return Split-Path -Parent $MyInvocation.MyCommand.Path
    }
    return $null
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "          MailScanner - Local Setup" -ForegroundColor Cyan
Write-Host "       Outlook Client Email Scanner (Windows)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ensure Node.js
Write-Step "Checking for Node.js"
if (Test-Command node) {
    Write-Ok "Node.js found: $(node --version)"
} else {
    Write-Warn "Node.js not found. Installing via winget..."
    if (-not (Test-Command winget)) {
        Write-Err "winget not available. Install Node.js from https://nodejs.org and re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (-not (Test-Command node)) {
        Write-Err "Node.js install did not register in PATH. Open a NEW PowerShell window and re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-Ok "Node.js installed: $(node --version)"
}

# 2. Ensure git
Write-Step "Checking for git"
if (Test-Command git) {
    Write-Ok "git found: $(git --version)"
} else {
    Write-Warn "git not found. Installing via winget..."
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (-not (Test-Command git)) {
        Write-Err "git install failed. Install from https://git-scm.com and re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-Ok "git installed"
}

# 3. Determine repo location
$repoUrl  = "https://github.com/Daveshelly3/MailScanner.git"
$branch   = "claude/outlook-email-scanner-app-Nn0KL"
$scriptDir = Get-ScriptDir

$repoDir = $null
if ($scriptDir -and (Test-Path (Join-Path $scriptDir "backend\package.json"))) {
    $repoDir = $scriptDir
    Write-Ok "Running from cloned repo at $repoDir"
} else {
    $repoDir = Join-Path $env:USERPROFILE "MailScanner"
    Write-Step "Setting up repo at $repoDir"
    if (Test-Path (Join-Path $repoDir ".git")) {
        Push-Location $repoDir
        try {
            git fetch origin $branch 2>&1 | Out-Null
            git checkout $branch 2>&1 | Out-Null
            git pull origin $branch 2>&1 | Out-Null
            Write-Ok "Repo updated"
        } finally { Pop-Location }
    } else {
        if (Test-Path $repoDir) {
            Write-Warn "Folder $repoDir exists but is not a git repo. Removing..."
            Remove-Item -Recurse -Force $repoDir
        }
        git clone --branch $branch $repoUrl $repoDir
        if ($LASTEXITCODE -ne 0) {
            Write-Err "git clone failed."
            Read-Host "Press Enter to exit"; exit 1
        }
        Write-Ok "Repo cloned"
    }
}

# 4. Install backend deps
Write-Step "Installing backend dependencies"
Push-Location (Join-Path $repoDir "backend")
try {
    npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw "Backend npm install failed" }
    Write-Ok "Backend dependencies installed"
} finally { Pop-Location }

# 5. .env file
$envPath        = Join-Path $repoDir "backend\.env"
$envExamplePath = Join-Path $repoDir "backend\.env.example"
if (-not (Test-Path $envPath)) {
    Copy-Item $envExamplePath $envPath
    Write-Step "Configuring API key"
    Write-Host "You need an Anthropic API key. Get one at:" -ForegroundColor Yellow
    Write-Host "  https://console.anthropic.com/settings/keys" -ForegroundColor Yellow
    Write-Host ""
    $apiKey = Read-Host "Paste your ANTHROPIC_API_KEY (starts with sk-ant-)"
    if ($apiKey) {
        (Get-Content $envPath) -replace 'ANTHROPIC_API_KEY=.*', "ANTHROPIC_API_KEY=$apiKey" | Set-Content $envPath
        Write-Ok "API key saved to backend\.env"
    } else {
        Write-Warn "No key entered. Edit backend\.env manually before starting."
    }
} else {
    Write-Ok ".env already exists"
}

# 6. SQLite DB setup
Write-Step "Setting up local SQLite database"
Push-Location (Join-Path $repoDir "backend")
try {
    & npx --yes prisma db push --skip-generate 2>&1 | Out-Null
    & npx --yes prisma generate 2>&1 | Out-Null
    Write-Ok "Database initialized"
} finally { Pop-Location }

# 7. Frontend deps + build
Write-Step "Installing frontend dependencies"
Push-Location (Join-Path $repoDir "frontend")
try {
    npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw "Frontend npm install failed" }
    Write-Ok "Frontend dependencies installed"

    Write-Step "Building frontend"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    Write-Ok "Frontend built to frontend\dist"
} finally { Pop-Location }

# 8. Done
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "  Repo: $repoDir" -ForegroundColor Green
Write-Host "  To start later, run:" -ForegroundColor Green
Write-Host "    cd $repoDir; .\start.ps1" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

$start = Read-Host "Start MailScanner now? (Y/n)"
if ($start -ne 'n' -and $start -ne 'N') {
    Set-Location (Join-Path $repoDir "backend")
    Write-Host ""
    Write-Host "MailScanner is running at: http://localhost:3001" -ForegroundColor Cyan
    Start-Process "http://localhost:3001"
    Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host ""
    node src/index.js
}
