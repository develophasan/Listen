#!/bin/bash

# 🎙️ Listen Host Auto-Setup & Launcher
# ------------------------------------
# This script automates the installation of Python, dependencies, 
# and the configuration of the Listen audio host.

set -e # Exit on error

echo "----------------------------------------"
echo "🚀 Listen Host Setup Protocol Initiated"
echo "----------------------------------------"

# 1. Dependency Check
check_cmd() {
    command -v "$1" >/dev/null 2>&1
}

# 2. Python3 Check & Installation (macOS focus)
if ! check_cmd python3; then
    echo "⚠️ Python3 not found. Checking OS..."
    OS="$(uname)"
    if [ "$OS" == "Darwin" ]; then
        echo "🍎 macOS detected. Checking for Homebrew..."
        if ! check_cmd brew; then
            echo "📦 Homebrew not found. Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        echo "🐍 Installing Python via Homebrew..."
        brew install python
    else
        echo "❌ Python3 is missing. Please install it for your OS and try again."
        exit 1
    fi
fi

# 3. Git Check
if ! check_cmd git; then
    echo "❌ Git not found. Please install Git."
    exit 1
fi

echo "✅ Environment check passed. Python: $(python3 --version | head -n 1)"

# 4. Repository Setup
if [ ! -d "Listen" ] && [ ! -f "host.py" ]; then
    echo "📡 Downloading source code from GitHub..."
    git clone https://github.com/develophasan/Listen.git
    cd Listen
elif [ -d ".git" ]; then
    echo "📂 Inside repository. Checking for updates..."
    git pull
fi

# 5. Virtual Environment
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

echo "⚗️ Synchronizing dependencies..."
./.venv/bin/pip install --quiet --upgrade pip
./.venv/bin/pip install --quiet python-dotenv supabase aiortc pyaudio numpy

# 6. Configuration (.env)
if [ ! -f ".env" ]; then
    echo ""
    echo "🔐 --- CONFIGURATION REQUIRED ---"
    echo "Please enter your Supabase credentials found in your dashboard."
    read -p "SUPABASE_URL: " sb_url
    read -p "SUPABASE_KEY: " sb_key
    
    echo "SUPABASE_URL=$sb_url" > .env
    echo "SUPABASE_KEY=$sb_key" >> .env
    echo "✅ .env configured."
fi

# 7. Execution
echo ""
echo "🔥 Protocol started. Audio streaming is ready."
echo "----------------------------------------"
./.venv/bin/python host.py
