# 🎙️ Listen Host Auto-Setup & Launcher (Windows PowerShell)
# --------------------------------------------------------

$ErrorActionPreference = "Stop"

Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 Listen Host Setup Protocol Initiated" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# 1. Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Python from python.org and ensure 'Add to PATH' is checked." -ForegroundColor Yellow
    exit
}

# 2. Check Git
try {
    $gitVersion = git --version 2>&1
    Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git is not installed." -ForegroundColor Red
    Write-Host "Please install Git from git-scm.com." -ForegroundColor Yellow
    exit
}

# 3. Repository Setup
if (!(Test-Path "host.py") -and !(Test-Path "Listen")) {
    Write-Host "📡 Downloading source code from GitHub..." -ForegroundColor Cyan
    git clone https://github.com/develophasan/Listen.git
    Set-Location Listen
} elseif (Test-Path ".git") {
    Write-Host "📂 Inside repository. Checking for updates..." -ForegroundColor Cyan
    git pull
}

# 4. Virtual Environment
if (!(Test-Path ".venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

Write-Host "⚗️ Synchronizing dependencies..." -ForegroundColor Cyan
& ".\.venv\Scripts\pip.exe" install --quiet --upgrade pip
& ".\.venv\Scripts\pip.exe" install --quiet python-dotenv supabase aiortc pyaudio numpy

# 5. Configuration (.env)
if (!(Test-Path ".env")) {
    Write-Host ""
    Write-Host "🔐 --- CONFIGURATION REQUIRED ---" -ForegroundColor Yellow
    Write-Host "Please enter your Supabase credentials found in your dashboard." -ForegroundColor Yellow
    
    $sb_url = Read-Host "SUPABASE_URL"
    $sb_key = Read-Host "SUPABASE_KEY"
    
    "SUPABASE_URL=$sb_url" | Out-File -FilePath .env -Encoding utf8
    "SUPABASE_KEY=$sb_key" | Out-File -FilePath .env -Append -Encoding utf8
    Write-Host "✅ .env configured." -ForegroundColor Green
}

# 6. Execution
Write-Host ""
Write-Host "🔥 Protocol started. Audio streaming is ready." -ForegroundColor Magenta
Write-Host "----------------------------------------" -ForegroundColor Magenta

& ".\.venv\Scripts\python.exe" host.py
