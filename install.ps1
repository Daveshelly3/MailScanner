# MailScanner - One-click Windows installer
# Run from PowerShell:
#   iwr -useb https://raw.githubusercontent.com/Daveshelly3/MailScanner/claude/outlook-email-scanner-app-Nn0KL/install.ps1 | iex
# Or after cloning:
#   PowerShell -ExecutionPolicy Bypass -File .\install.ps1

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green  }
function Write-Warn($msg) { Write-Host "[!]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[X]  $msg" -ForegroundColor Red    }

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") +
                ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}
function Test-Command($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Get-ScriptDir {
    if ($PSScriptRoot) { return $PSScriptRoot }
    if ($MyInvocation.MyCommand.Path) { return Split-Path -Parent $MyInvocation.MyCommand.Path }
    return $null
}
function Set-EnvValue($path, $key, $value) {
    $content = Get-Content $path
    if ($content -match "^$key=") {
        ($content -replace "^$key=.*", "$key=$value") | Set-Content $path
    } else {
        Add-Content $path "$key=$value"
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "          MailScanner - Local Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Node.js
Write-Step "Checking for Node.js"
if (Test-Command node) { Write-Ok "Node.js found: $(node --version)" }
else {
    Write-Warn "Installing Node.js via winget..."
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (-not (Test-Command node)) {
        Write-Err "Open a new PowerShell window after install and re-run."
        Read-Host "Press Enter to exit"; exit 1
    }
    Write-Ok "Node.js installed: $(node --version)"
}

# 2. git
Write-Step "Checking for git"
if (Test-Command git) { Write-Ok "git found" }
else {
    Write-Warn "Installing git via winget..."
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (-not (Test-Command git)) { Write-Err "git install failed"; Read-Host "Press Enter"; exit 1 }
    Write-Ok "git installed"
}

# 3. Repo
$repoUrl   = "https://github.com/Daveshelly3/MailScanner.git"
$branch    = "claude/outlook-email-scanner-app-Nn0KL"
$scriptDir = Get-ScriptDir
$repoDir   = if ($scriptDir -and (Test-Path (Join-Path $scriptDir "backend\package.json"))) {
    $scriptDir
} else { Join-Path $env:USERPROFILE "MailScanner" }

if (Test-Path (Join-Path $repoDir ".git")) {
    Write-Step "Updating existing repo at $repoDir"
    Push-Location $repoDir
    try {
        git fetch origin $branch 2>&1 | Out-Null
        git checkout $branch     2>&1 | Out-Null
        git pull origin $branch  2>&1 | Out-Null
        Write-Ok "Repo updated"
    } finally { Pop-Location }
} elseif (-not (Test-Path (Join-Path $repoDir "backend\package.json"))) {
    Write-Step "Cloning to $repoDir"
    if (Test-Path $repoDir) { Remove-Item -Recurse -Force $repoDir }
    git clone --branch $branch $repoUrl $repoDir
    if ($LASTEXITCODE -ne 0) { Write-Err "Clone failed"; Read-Host "Press Enter"; exit 1 }
    Write-Ok "Repo cloned"
}

# 4. Backend deps
Write-Step "Installing backend dependencies (this can take 60s)"
Push-Location (Join-Path $repoDir "backend")
try {
    npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw "Backend npm install failed" }
    Write-Ok "Backend deps installed"
} finally { Pop-Location }

# 5. .env
$envPath        = Join-Path $repoDir "backend\.env"
$envExamplePath = Join-Path $repoDir "backend\.env.example"
if (-not (Test-Path $envPath)) {
    Copy-Item $envExamplePath $envPath
    Write-Ok ".env created"
}

# Anthropic key
$envContent = Get-Content $envPath -Raw
if ($envContent -notmatch '^ANTHROPIC_API_KEY=sk-ant-' -and $envContent -notmatch '^ANTHROPIC_API_KEY=[^\s]+\w') {
    Write-Step "Anthropic API key"
    Write-Host "Get one at https://console.anthropic.com/settings/keys" -ForegroundColor Yellow
    $key = Read-Host "Paste ANTHROPIC_API_KEY (starts with sk-ant-)"
    if ($key) { Set-EnvValue $envPath 'ANTHROPIC_API_KEY' $key; Write-Ok "API key saved" }
}

# IMAP credentials (recommended)
$envContent = Get-Content $envPath -Raw
$hasImapUser = $envContent -match '(?m)^IMAP_USER=[^\s]+\w'
$hasImapPass = $envContent -match '(?m)^IMAP_PASSWORD=[^\s]+\w'
if (-not ($hasImapUser -and $hasImapPass)) {
    Write-Step "Outlook IMAP credentials"
    Write-Host ""
    Write-Host "MailScanner connects to Outlook via IMAP. You need an App Password" -ForegroundColor Yellow
    Write-Host "(a 16-char code Microsoft generates so the app can sign in even with 2FA)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Open https://account.microsoft.com/security"
    Write-Host "  2. Click 'Advanced security options'"
    Write-Host "  3. Under 'App passwords', click 'Create a new app password'"
    Write-Host "  4. Copy the 16-character code shown (no spaces)"
    Write-Host ""
    $skipImap = Read-Host "Skip IMAP setup for now? (y/N)"
    if ($skipImap -ne 'y' -and $skipImap -ne 'Y') {
        $imapUser = Read-Host "Outlook email address"
        $imapPass = Read-Host "App password (16-char code)"
        if ($imapUser) { Set-EnvValue $envPath 'IMAP_USER'     $imapUser }
        if ($imapPass) { Set-EnvValue $envPath 'IMAP_PASSWORD' $imapPass }
        Set-EnvValue $envPath 'IMAP_HOST' 'outlook.office365.com'
        Set-EnvValue $envPath 'IMAP_PORT' '993'
        Write-Ok "IMAP credentials saved"
    } else {
        Write-Warn "Edit backend\.env later to set IMAP_USER and IMAP_PASSWORD"
    }
}

# 6. SQLite + Prisma
Write-Step "Setting up SQLite database"
Push-Location (Join-Path $repoDir "backend")
try {
    & npx --yes prisma db push --skip-generate 2>&1 | Out-Null
    & npx --yes prisma generate                  2>&1 | Out-Null
    Write-Ok "Database initialised"
} finally { Pop-Location }

# 7. Frontend
Write-Step "Installing frontend dependencies"
Push-Location (Join-Path $repoDir "frontend")
try {
    npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { throw "Frontend npm install failed" }
    Write-Step "Building frontend"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    Write-Ok "Frontend built"
} finally { Pop-Location }

# 8. Done
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "  Repo: $repoDir" -ForegroundColor Green
Write-Host "  Run later with: cd $repoDir; .\start.ps1" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

$go = Read-Host "Start MailScanner now? (Y/n)"
if ($go -ne 'n' -and $go -ne 'N') {
    Set-Location (Join-Path $repoDir "backend")
    Write-Host "MailScanner running at: http://localhost:3001" -ForegroundColor Cyan
    Start-Process "http://localhost:3001"
    Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
    node src/index.js
}
