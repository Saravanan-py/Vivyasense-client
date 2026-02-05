# VivyaSense Deployment Guide

This guide explains how to deploy VivyaSense in different modes (CPU/GPU) and environments (Local/Docker).

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Modes](#deployment-modes)
3. [Local Deployment](#local-deployment)
4. [Docker Deployment](#docker-deployment)
5. [System Requirements](#system-requirements)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Choose Your Deployment Mode

**Do you have an NVIDIA GPU?**
- ✅ **YES** → Use GPU mode for best performance (60+ FPS)
- ❌ **NO** → Use CPU mode (25-40 FPS)

**Do you want to use Docker?**
- ✅ **YES** → Use Docker deployment scripts
- ❌ **NO** → Use local deployment scripts

---

## 🎯 Deployment Modes

### GPU Mode (Recommended)
- **Performance**: 60+ FPS
- **Requirements**: NVIDIA GPU with 4GB+ VRAM, CUDA 11.8+
- **Best for**: Production, multiple cameras, real-time AI

### CPU Mode
- **Performance**: 25-40 FPS (raw), 15-25 FPS (with AI)
- **Requirements**: Intel i5/AMD Ryzen 5 or better
- **Best for**: Testing, single camera, limited hardware

---

## 💻 Local Deployment

### Windows

#### GPU Mode
```batch
start-gpu.bat
```

#### CPU Mode
```batch
start-cpu.bat
```

### Linux/macOS

#### GPU Mode
```bash
chmod +x start-gpu.sh
./start-gpu.sh
```

#### CPU Mode
```bash
chmod +x start-cpu.sh
./start-cpu.sh
```

### What These Scripts Do

1. ✅ Check Python installation (3.9 or 3.10 required)
2. ✅ Check GPU availability (GPU mode only)
3. ✅ Create virtual environment (`sense_env`)
4. ✅ Install dependencies (CPU or GPU specific)
5. ✅ Start the backend server

### Access Points

- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Frontend**: Configure separately or use Docker

---

## 🐳 Docker Deployment

### Prerequisites

1. **Install Docker Desktop**
   - Windows/macOS: https://www.docker.com/products/docker-desktop
   - Linux: https://docs.docker.com/engine/install/

2. **For GPU Mode: Install NVIDIA Container Toolkit**
   ```bash
   # Ubuntu/Debian
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
       sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   
   sudo apt-get update
   sudo apt-get install -y nvidia-docker2
   sudo systemctl restart docker
   ```

### Windows

#### GPU Mode
```batch
docker-start-gpu.bat
```

#### CPU Mode
```batch
docker-start-cpu.bat
```

### Linux/macOS

#### GPU Mode
```bash
chmod +x docker-start-gpu.sh
./docker-start-gpu.sh
```

#### CPU Mode
```bash
chmod +x docker-start-cpu.sh
./docker-start-cpu.sh
```

### What These Scripts Do

1. ✅ Check Docker installation and status
2. ✅ Check GPU and NVIDIA Container Toolkit (GPU mode)
3. ✅ Build Docker images
4. ✅ Start all services (backend, database, Redis, frontend)
5. ✅ Display service status and URLs

### Access Points

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f                    # GPU mode
docker-compose -f docker-compose.cpu.yml logs -f  # CPU mode

# Stop services
docker-compose down                       # GPU mode
docker-compose -f docker-compose.cpu.yml down     # CPU mode

# Restart services
docker-compose restart                    # GPU mode
docker-compose -f docker-compose.cpu.yml restart  # CPU mode

# Check GPU status (GPU mode only)
docker exec vivyasense-backend-gpu nvidia-smi
```

---

## 🖥️ System Requirements

### GPU Mode (Recommended)

#### Minimum Requirements
| Component | Specification |
|-----------|--------------|
| **OS** | Windows 10/11, Ubuntu 20.04+, macOS 10.15+ |
| **GPU** | NVIDIA GPU with 4GB+ VRAM (GTX 1650, RTX 3050+) |
| **CUDA** | CUDA 11.8+ support |
| **RAM** | 8GB minimum |
| **CPU** | Intel i5 / AMD Ryzen 5 (4+ cores) |
| **Storage** | 20GB free (SSD recommended) |
| **Python** | Python 3.9 or 3.10 |
| **Network** | Gigabit Ethernet for RTSP |

#### Recommended for Production
| Component | Specification |
|-----------|--------------|
| **GPU** | NVIDIA RTX 3060/4060 (6GB+ VRAM) |
| **RAM** | 16GB |
| **CPU** | Intel i7 / AMD Ryzen 7 (8+ cores) |
| **Storage** | 50GB+ SSD |

**Recommended Laptops:**
- ASUS TUF Gaming A16 (RTX 4060)
- MSI Katana 15 (RTX 4060)
- Lenovo LOQ 15 (RTX 4060)
- Dell G15 (RTX 4060)

### CPU Mode

#### Minimum Requirements
| Component | Specification |
|-----------|--------------|
| **OS** | Windows 10/11, Ubuntu 20.04+, macOS 10.15+ |
| **RAM** | 8GB minimum |
| **CPU** | Intel i5 / AMD Ryzen 5 (4+ cores) |
| **Storage** | 15GB free |
| **Python** | Python 3.9 or 3.10 |
| **Network** | Gigabit Ethernet for RTSP |

#### Recommended
| Component | Specification |
|-----------|--------------|
| **RAM** | 16GB |
| **CPU** | Intel i7 / AMD Ryzen 7 (8+ cores) |
| **Storage** | 30GB+ SSD |

---

## 🔧 Troubleshooting

### Local Deployment Issues

#### Python Not Found
```bash
# Install Python 3.10
# Windows: Download from https://www.python.org/downloads/
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install python3.10 python3.10-venv python3-pip

# macOS:
brew install python@3.10
```

#### GPU Not Detected (GPU Mode)
```bash
# Check NVIDIA driver installation
nvidia-smi

# If not found, install NVIDIA drivers:
# Windows: https://www.nvidia.com/Download/index.aspx
# Ubuntu: sudo ubuntu-drivers autoinstall
```

#### Virtual Environment Creation Failed
```bash
# Ensure python3-venv is installed (Linux)
sudo apt-get install python3.10-venv

# Or use virtualenv
pip install virtualenv
virtualenv sense_env
```

#### Dependency Installation Failed
```bash
# Update pip first
python -m pip install --upgrade pip

# Install build tools (Linux)
sudo apt-get install build-essential python3-dev

# Install build tools (Windows)
# Download Visual Studio Build Tools from Microsoft
```

### Docker Deployment Issues

#### Docker Not Running
```bash
# Windows/macOS: Start Docker Desktop application
# Linux:
sudo systemctl start docker
sudo systemctl enable docker
```

#### NVIDIA Container Toolkit Not Found (GPU Mode)
```bash
# Verify installation
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# If failed, reinstall NVIDIA Container Toolkit:
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
```

#### Port Already in Use
```bash
# Check what's using the port
# Windows:
netstat -ano | findstr :8000

# Linux/macOS:
lsof -i :8000

# Stop the conflicting service or change ports in docker-compose.yml
```

#### Container Build Failed
```bash
# Clean Docker cache and rebuild
docker system prune -a
docker-compose build --no-cache

# For GPU mode:
docker-compose -f docker-compose.yml build --no-cache

# For CPU mode:
docker-compose -f docker-compose.cpu.yml build --no-cache
```

#### Database Connection Failed
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# View database logs
docker logs vivyasense-db-gpu    # GPU mode
docker logs vivyasense-db-cpu    # CPU mode

# Restart database
docker-compose restart db
```

### Performance Issues

#### Low FPS in GPU Mode
1. **Check GPU utilization**: `nvidia-smi`
2. **Ensure CUDA is being used**: Check backend logs for "GPU-ACCELERATED"
3. **Update NVIDIA drivers** to latest version
4. **Check thermal throttling**: Monitor GPU temperature
5. **Close other GPU-intensive applications**

#### Low FPS in CPU Mode
1. **Expected behavior**: CPU mode is limited to 25-40 FPS
2. **Reduce AI processing**: Increase frame skip in settings
3. **Lower resolution**: Configure camera to stream at lower resolution
4. **Upgrade hardware**: Consider GPU-enabled system

#### High Latency
1. **Network issues**: Use wired Ethernet instead of WiFi
2. **RTSP settings**: Check camera RTSP stream configuration
3. **Reduce buffer size**: Already optimized in code
4. **Check CPU/GPU load**: Monitor system resources

### Camera Connection Issues

#### RTSP Stream Not Connecting
1. **Verify RTSP URL**: Test with VLC Media Player
2. **Check network connectivity**: Ping camera IP
3. **Verify credentials**: Username/password in RTSP URL
4. **Check firewall**: Allow RTSP port (usually 554)
5. **Try TCP transport**: Already configured by default

#### Frame Drops
1. **Network bandwidth**: Ensure sufficient bandwidth
2. **Camera settings**: Reduce camera bitrate/resolution
3. **System resources**: Check CPU/GPU/RAM usage
4. **Multiple cameras**: May need more powerful hardware

---

## 📞 Support

For additional help:
1. Check application logs in `backend/logs/`
2. Review Docker logs: `docker-compose logs -f`
3. Check system resources: CPU, RAM, GPU usage
4. Verify network connectivity to cameras

---

## 📝 Notes

- **GPU Mode** requires NVIDIA GPU with CUDA support
- **Docker GPU Mode** requires NVIDIA Container Toolkit
- **Always use wired Ethernet** for RTSP cameras when possible
- **Keep NVIDIA drivers updated** for best GPU performance
- **SSD storage recommended** for better I/O performance
- **Virtual environment** is automatically created by startup scripts

