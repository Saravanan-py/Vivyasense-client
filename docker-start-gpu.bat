@echo off
REM ============================================================================
REM VivyaSense Docker GPU Mode Startup Script
REM Starts the application in Docker containers with NVIDIA GPU support
REM Requires: NVIDIA Container Toolkit (nvidia-docker2)
REM ============================================================================

echo.
echo ========================================
echo   VivyaSense - Docker GPU Mode
echo ========================================
echo.

REM Check Docker installation
echo [1/4] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker is installed

REM Check if Docker is running
echo [2/4] Checking if Docker is running...
docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running

REM Check NVIDIA GPU
echo [3/4] Checking NVIDIA GPU...
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo [ERROR] NVIDIA GPU not detected!
    echo.
    echo This script is for GPU-enabled systems only.
    echo For CPU systems, use docker-start-cpu.bat instead.
    echo.
    pause
    exit /b 1
)
echo [OK] NVIDIA GPU detected
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader

REM Check NVIDIA Container Toolkit
echo.
echo [INFO] Checking NVIDIA Container Toolkit...
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo [WARNING] NVIDIA Container Toolkit may not be installed!
    echo.
    echo Please install it from:
    echo https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
    echo.
    echo Continuing anyway...
    timeout /t 5 /nobreak >nul
) else (
    echo [OK] NVIDIA Container Toolkit is working
)

REM Start Docker containers
echo.
echo [4/4] Starting VivyaSense (GPU mode)...
echo This may take a few minutes on first run...
echo.

docker-compose -f docker-compose.yml up -d --build

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start containers!
    echo.
    pause
    exit /b 1
)

REM Wait for services to be ready
echo.
echo Waiting for services to initialize...
timeout /t 30 /nobreak >nul

REM Check service status
echo.
echo Checking service status...
docker-compose -f docker-compose.yml ps

echo.
echo ========================================
echo   VivyaSense Started Successfully!
echo ========================================
echo.
echo Mode: GPU-ACCELERATED (NVIDIA CUDA)
echo Expected FPS: 60+ FPS
echo.
echo Application URLs:
echo   Frontend:        http://localhost
echo   Backend API:     http://localhost:8000
echo   API Docs:        http://localhost:8000/docs
echo.
echo ========================================
echo.
echo Useful Commands:
echo   View logs:       docker-compose logs -f
echo   Stop app:        docker-compose down
echo   Restart app:     docker-compose restart
echo   GPU status:      docker exec vivyasense-backend-gpu nvidia-smi
echo.
echo ========================================
echo.
pause

