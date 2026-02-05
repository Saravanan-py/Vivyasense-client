#!/bin/bash
# ============================================================================
# VivyaSense CPU Mode Startup Script
# Starts the application in CPU-only mode (no GPU required)
# ============================================================================

echo ""
echo "========================================"
echo "  VivyaSense - CPU Mode Startup"
echo "========================================"
echo ""

# Check Python installation
echo "[1/4] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python is not installed!"
    echo "Please install Python 3.9 or 3.10"
    exit 1
fi
echo "[OK] Python is installed"

# Navigate to backend
cd backend

# Check if virtual environment exists
if [ ! -d "sense_env" ]; then
    echo "[2/4] Creating virtual environment..."
    python3 -m venv sense_env
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        exit 1
    fi
    echo "[OK] Virtual environment created"
else
    echo "[2/4] Virtual environment already exists"
fi

# Activate virtual environment
echo "[3/4] Activating virtual environment..."
source sense_env/bin/activate
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to activate virtual environment"
    exit 1
fi
echo "[OK] Virtual environment activated"

# Install/Update dependencies
echo "[4/4] Installing CPU dependencies..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.cpu.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    exit 1
fi
echo "[OK] Dependencies installed"

# Start the backend
echo ""
echo "========================================"
echo "  Starting VivyaSense Backend (CPU)"
echo "========================================"
echo ""
echo "Mode: CPU-ONLY"
echo "Expected FPS: 25-40 FPS (raw stream)"
echo "Expected FPS: 15-25 FPS (with AI)"
echo ""
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python main.py

