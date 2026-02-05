#!/bin/bash
# ============================================================================
# VivyaSense Docker CPU Mode Startup Script
# Starts the application in Docker containers (CPU-only mode)
# ============================================================================

echo ""
echo "========================================"
echo "  VivyaSense - Docker CPU Mode"
echo "========================================"
echo ""

# Check Docker installation
echo "[1/3] Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed!"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi
echo "[OK] Docker is installed"

# Check if Docker is running
echo "[2/3] Checking if Docker is running..."
if ! docker ps &> /dev/null; then
    echo "[ERROR] Docker is not running!"
    echo ""
    echo "Please start Docker and try again."
    exit 1
fi
echo "[OK] Docker is running"

# Start Docker containers
echo ""
echo "[3/3] Starting VivyaSense (CPU mode)..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose -f docker-compose.cpu.yml up -d --build

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Failed to start containers!"
    exit 1
fi

# Wait for services to be ready
echo ""
echo "Waiting for services to initialize..."
sleep 30

# Check service status
echo ""
echo "Checking service status..."
docker-compose -f docker-compose.cpu.yml ps

echo ""
echo "========================================"
echo "  VivyaSense Started Successfully!"
echo "========================================"
echo ""
echo "Mode: CPU-ONLY"
echo "Expected FPS: 25-40 FPS (raw stream)"
echo "Expected FPS: 15-25 FPS (with AI)"
echo ""
echo "Application URLs:"
echo "  Frontend:        http://localhost"
echo "  Backend API:     http://localhost:8000"
echo "  API Docs:        http://localhost:8000/docs"
echo ""
echo "========================================"
echo ""
echo "Useful Commands:"
echo "  View logs:       docker-compose -f docker-compose.cpu.yml logs -f"
echo "  Stop app:        docker-compose -f docker-compose.cpu.yml down"
echo "  Restart app:     docker-compose -f docker-compose.cpu.yml restart"
echo ""
echo "========================================"
echo ""

