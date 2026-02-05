#!/bin/bash
# ============================================================================
# Docker Entrypoint Script for VivyaSense
# Handles database initialization and service startup
# ============================================================================

set -e

echo "========================================="
echo "  VivyaSense Docker Container Starting"
echo "========================================="
echo ""

# Wait for PostgreSQL to be ready
echo "[1/3] Waiting for PostgreSQL..."
until nc -z -v -w30 db 5432; do
  echo "Waiting for database connection..."
  sleep 2
done
echo "[OK] PostgreSQL is ready"

# Wait for Redis to be ready
echo "[2/3] Waiting for Redis..."
until nc -z -v -w30 redis 6379; do
  echo "Waiting for Redis connection..."
  sleep 2
done
echo "[OK] Redis is ready"

# Check GPU availability (if running in GPU mode)
echo "[3/3] Checking GPU availability..."
if command -v nvidia-smi &> /dev/null; then
    echo "[OK] NVIDIA GPU detected:"
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
    echo "Mode: GPU-ACCELERATED"
else
    echo "[INFO] No GPU detected"
    echo "Mode: CPU-ONLY"
fi

echo ""
echo "========================================="
echo "  Starting Application"
echo "========================================="
echo ""

# Execute the main command
exec "$@"

