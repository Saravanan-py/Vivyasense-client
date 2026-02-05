@echo off
REM ============================================================================
REM VivyaSense Docker CPU Mode Startup Script
REM Starts the application in Docker containers (CPU-only mode)
REM ============================================================================

echo.
echo ========================================
echo   VivyaSense - Docker CPU Mode
echo ========================================
echo.

REM Check Docker installation
echo [1/3] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker is installed

REM Check if Docker is running
echo [2/3] Checking if Docker is running...
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

REM Start Docker containers
echo.
echo [3/3] Starting VivyaSense (CPU mode)...
echo This may take a few minutes on first run...
echo.

docker-compose -f docker-compose.cpu.yml up -d --build

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
docker-compose -f docker-compose.cpu.yml ps

echo.
echo ========================================
echo   VivyaSense Started Successfully!
echo ========================================
echo.
echo Mode: CPU-ONLY
echo Expected FPS: 25-40 FPS (raw stream)
echo Expected FPS: 15-25 FPS (with AI)
echo.
echo Application URLs:
echo   Frontend:        http://localhost
echo   Backend API:     http://localhost:8000
echo   API Docs:        http://localhost:8000/docs
echo.
echo ========================================
echo.
echo Useful Commands:
echo   View logs:       docker-compose -f docker-compose.cpu.yml logs -f
echo   Stop app:        docker-compose -f docker-compose.cpu.yml down
echo   Restart app:     docker-compose -f docker-compose.cpu.yml restart
echo.
echo ========================================
echo.
pause

