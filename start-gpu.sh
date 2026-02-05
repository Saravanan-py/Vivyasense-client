#!/bin/bash
# ============================================================================
# VivyaSense GPU Mode Startup Script
# Starts the application with NVIDIA GPU acceleration
# ============================================================================

echo ""
echo "========================================"
echo "  VivyaSense - GPU Mode Startup"
echo "========================================"
echo ""

# Check Python installation
echo "[1/5] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python is not installed!"
    echo "Please install Python 3.9 or 3.10"
    exit 1
fi
echo "[OK] Python is installed"

# Check if NVIDIA GPU is available
echo "[2/5] Checking NVIDIA GPU..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "[ERROR] NVIDIA GPU not detected!"
    echo ""
    echo "This script is for GPU-enabled systems only."
    echo "For CPU systems, use start-cpu.sh instead."
    echo ""
    exit 1
fi
echo "[OK] NVIDIA GPU detected"
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader

# Navigate to backend
cd backend

# Check if virtual environment exists
if [ ! -d "sense_env" ]; then
    echo "[3/5] Creating virtual environment..."
    python3 -m venv sense_env
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        exit 1
    fi
    echo "[OK] Virtual environment created"
else
    echo "[3/5] Virtual environment already exists"
fi

# Activate virtual environment
echo "[4/5] Activating virtual environment..."
source sense_env/bin/activate
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to activate virtual environment"
    exit 1
fi
echo "[OK] Virtual environment activated"

# Install/Update dependencies
echo "[5/5] Installing GPU dependencies (PyTorch with CUDA)..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.gpu.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    exit 1
fi
echo "[OK] Dependencies installed"

# Start the backend
echo ""
echo "========================================"
echo "  Starting VivyaSense Backend (GPU)"
echo "========================================"
echo ""
echo "Mode: GPU-ACCELERATED (NVIDIA CUDA)"
echo "Expected FPS: 60+ FPS"
echo ""
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python main.py

