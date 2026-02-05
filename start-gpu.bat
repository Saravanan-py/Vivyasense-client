@echo off
REM ============================================================================
REM VivyaSense GPU Mode Startup Script
REM Starts the application with NVIDIA GPU acceleration
REM ============================================================================

echo.
echo ========================================
echo   VivyaSense - GPU Mode Startup
echo ========================================
echo.

REM Check Python installation
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo Please install Python 3.9 or 3.10 from: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python is installed

REM Check if NVIDIA GPU is available
echo [2/5] Checking NVIDIA GPU...
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo [ERROR] NVIDIA GPU not detected!
    echo.
    echo This script is for GPU-enabled systems only.
    echo For CPU systems, use start-cpu.bat instead.
    echo.
    pause
    exit /b 1
)
echo [OK] NVIDIA GPU detected
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader

REM Navigate to backend
cd backend

REM Check if virtual environment exists
if not exist "sense_env" (
    echo [3/5] Creating virtual environment...
    python -m venv sense_env
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
) else (
    echo [3/5] Virtual environment already exists
)

REM Activate virtual environment
echo [4/5] Activating virtual environment...
call sense_env\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment activated

REM Install/Update dependencies
echo [5/5] Installing GPU dependencies (PyTorch with CUDA)...
pip install --upgrade pip >nul 2>&1
pip install -r requirements.gpu.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Start the backend
echo.
echo ========================================
echo   Starting VivyaSense Backend (GPU)
echo ========================================
echo.
echo Mode: GPU-ACCELERATED (NVIDIA CUDA)
echo Expected FPS: 60+ FPS
echo.
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py

REM If server stops, pause to see any error messages
echo.
echo Server stopped.
pause

