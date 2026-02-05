@echo off
REM ============================================================================
REM VivyaSense CPU Mode Startup Script
REM Starts the application in CPU-only mode (no GPU required)
REM ============================================================================

echo.
echo ========================================
echo   VivyaSense - CPU Mode Startup
echo ========================================
echo.

REM Check Python installation
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo Please install Python 3.9 or 3.10 from: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python is installed

REM Navigate to backend
cd backend

REM Check if virtual environment exists
if not exist "sense_env" (
    echo [2/4] Creating virtual environment...
    python -m venv sense_env
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
) else (
    echo [2/4] Virtual environment already exists
)

REM Activate virtual environment
echo [3/4] Activating virtual environment...
call sense_env\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment activated

REM Install/Update dependencies
echo [4/4] Installing CPU dependencies...
pip install --upgrade pip >nul 2>&1
pip install -r requirements.cpu.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Start the backend
echo.
echo ========================================
echo   Starting VivyaSense Backend (CPU)
echo ========================================
echo.
echo Mode: CPU-ONLY
echo Expected FPS: 25-40 FPS (raw stream)
echo Expected FPS: 15-25 FPS (with AI)
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

