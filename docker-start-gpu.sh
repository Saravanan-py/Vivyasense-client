#!/bin/bash
# ============================================================================
# VivyaSense Docker GPU Mode Startup Script
# Starts the application in Docker containers with NVIDIA GPU support
# Requires: NVIDIA Container Toolkit (nvidia-docker2)
# ============================================================================

echo ""
echo "========================================"
echo "  VivyaSense - Docker GPU Mode"
echo "========================================"
echo ""

# Check Docker installation
echo "[1/4] Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed!"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi
echo "[OK] Docker is installed"

# Check if Docker is running
echo "[2/4] Checking if Docker is running..."
if ! docker ps &> /dev/null; then
    echo "[ERROR] Docker is not running!"
    echo ""
    echo "Please start Docker and try again."
    exit 1
fi
echo "[OK] Docker is running"

# Check NVIDIA GPU
echo "[3/4] Checking NVIDIA GPU..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "[ERROR] NVIDIA GPU not detected!"
    echo ""
    echo "This script is for GPU-enabled systems only."
    echo "For CPU systems, use docker-start-cpu.sh instead."
    exit 1
fi
echo "[OK] NVIDIA GPU detected"
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader

# Check NVIDIA Container Toolkit
echo ""
echo "[INFO] Checking NVIDIA Container Toolkit..."
if docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
    echo "[OK] NVIDIA Container Toolkit is working"
else
    echo "[WARNING] NVIDIA Container Toolkit may not be installed!"
    echo ""
    echo "Please install it from:"
    echo "https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
    echo ""
    echo "Continuing anyway..."
    sleep 5
fi

# Start Docker containers
echo ""
echo "[4/4] Starting VivyaSense (GPU mode)..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose -f docker-compose.yml up -d --build

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
docker-compose -f docker-compose.yml ps

echo ""
echo "========================================"
echo "  VivyaSense Started Successfully!"
echo "========================================"
echo ""
echo "Mode: GPU-ACCELERATED (NVIDIA CUDA)"
echo "Expected FPS: 60+ FPS"
echo ""
echo "Application URLs:"
echo "  Frontend:        http://localhost"
echo "  Backend API:     http://localhost:8000"
echo "  API Docs:        http://localhost:8000/docs"
echo ""
echo "========================================"
echo ""
echo "Useful Commands:"
echo "  View logs:       docker-compose logs -f"
echo "  Stop app:        docker-compose down"
echo "  Restart app:     docker-compose restart"
echo "  GPU status:      docker exec vivyasense-backend-gpu nvidia-smi"
echo ""
echo "========================================"
echo ""

