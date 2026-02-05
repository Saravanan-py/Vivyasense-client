# VivyaSense - AI Video Analytics Platform

A comprehensive full-stack AI Video Analytics application for restricted zone monitoring, PPE detection, fire detection, smoke detection, and intrusion detection.

---

## 🚀 Quick Start - Choose Your Deployment

VivyaSense offers **TWO deployment options** optimized for different use cases:

| Deployment | Use Case | Performance | Setup |
|------------|----------|-------------|-------|
| **[1. Local GPU](#1-local-gpu-setup)** | Development laptop with NVIDIA GPU | **60+ FPS** | No Docker |
| **[2. Client CPU](#2-client-cpu-setup)** | Client systems without GPU | **30-40 FPS** | No Docker |

---

## 📚 Additional Documentation

For detailed guides, see:
- **[Getting Started Guide](GETTING_STARTED.md)** - Step-by-step installation
- **[Project Overview](PROJECT_OVERVIEW.md)** - Architecture and tech stack
- **[Features List](FEATURES.md)** - Complete list of 150+ features
- **[API Documentation](API_DOCUMENTATION.md)** - REST API reference
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Custom Models Guide](CUSTOM_MODELS_GUIDE.md)** - Add custom detection models

---

## 📋 System Requirements

### All Deployments
- **OS**: Windows 10/11, Ubuntu 20.04+, macOS 10.15+
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 20GB free disk space
- **Python**: 3.9 or 3.10 (for non-Docker deployments)

### GPU Deployment (Option 1)
- **GPU**: NVIDIA GPU with CUDA 11.8+ support
- **VRAM**: 4GB minimum (6GB+ recommended)
- **Drivers**: Latest NVIDIA drivers installed



---

## 🎯 Deployment Options

### 1. Local GPU Setup
**Best for:** Development laptop with NVIDIA GPU
**Performance:** 60+ FPS
**Docker:** Not required

#### Windows
```bash
# Navigate to project directory
cd vivyasense_admin

# Run GPU startup script
start-local-gpu.bat
```

#### Linux/macOS
```bash
# Navigate to project directory
cd vivyasense_admin

# Make script executable
chmod +x start-local-gpu.sh

# Run GPU startup script
./start-local-gpu.sh
```

**What it does:**
1. ✅ Checks for Python installation
2. ✅ Verifies NVIDIA GPU is available
3. ✅ Creates virtual environment
4. ✅ Installs GPU dependencies (PyTorch with CUDA)
5. ✅ Starts backend server

**Access:**
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Expected Performance:**
- Single camera: 60+ FPS
- Multiple cameras: 50-60 FPS per camera
- Latency: <1 second

---

### 2. Client CPU Setup
**Best for:** Client systems without GPU - Direct installation
**Performance:** 30-40 FPS
**Docker:** Not required

#### Windows
```bash
# Navigate to project directory
cd vivyasense_admin

# Run CPU startup script
start-client-cpu.bat
```

#### Linux/macOS
```bash
# Navigate to project directory
cd vivyasense_admin

# Make script executable
chmod +x start-client-cpu.sh

# Run CPU startup script
./start-client-cpu.sh
```

**What it does:**
1. ✅ Checks for Python installation
2. ✅ Creates virtual environment
3. ✅ Installs CPU dependencies (PyTorch CPU version)
4. ✅ Starts backend server

**Access:**
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Expected Performance:**
- Single camera: 30-40 FPS
- 2 cameras: 20-30 FPS per camera
- 3+ cameras: 15-25 FPS per camera
- Latency: 2-4 seconds

---

## 🚀 Features

### Core Features
- **Camera Configuration & Management**: Add and manage IP cameras via RTSP URL or webcam
- **Custom Model Selection**: Choose from specialized detection models (General, PPE, Fire, Smoke, Fall)
- **Webcam Support**: Use your computer's webcam for testing and demos
- **AI Detection Settings**: Adjustable confidence threshold and class filtering
- **Interactive ROI Drawing**: Draw multiple custom polygon zones on camera feeds
- **Real-Time Monitoring**: Live video feeds with drag-and-drop grid layout
- **Analytics Dashboard**: Comprehensive statistics and visualizations
- **Notification System**: Email alerts with detection snapshots
- **Detection Logs**: Detailed logging with image capture

### Detection Models
- 🎯 **General Detection**: Person, vehicles, 80+ objects (Default, ready to use)
- 🦺 **PPE Detection**: Hardhat, safety vest, mask detection (Requires custom model)
- 🔥 **Fire Detection**: Fire and smoke detection (Requires custom model)
- 🚨 **Fall Detection**: Person fall detection (Requires custom model)

### Technical Highlights
- Real-time object detection using YOLOv8
- Support for custom trained models
- PostgreSQL database for persistent storage
- RESTful API with FastAPI
- Modern React UI with Tailwind CSS
- Canvas-based ROI drawing with Konva
- Email notifications with HTML templates
- Webcam and RTSP stream support

---

## 📊 Performance Comparison

| Deployment | Hardware | FPS (1 cam) | FPS (3 cams) | Latency | Setup Time |
|------------|----------|-------------|--------------|---------|------------|
| **Local GPU** | NVIDIA GPU | 60+ FPS | 50-60 FPS | <1 sec | 5 min |
| **Client CPU** | CPU only | 30-40 FPS | 15-25 FPS | 2-4 sec | 5 min |

**Recommendation:**
- **Development:** Use Local GPU setup for fastest performance
- **Client:** Use Client CPU setup for simple installation

---

## 🔧 Configuration

### Email Alerts

Create a `.env` file in the `backend` directory:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**For Gmail:** Use App Password: https://support.google.com/accounts/answer/185833

### Database Configuration

Configure in `.env` file:
```env
DATABASE_URL=postgresql://vivyasense:vivyasense123@localhost:5432/vivyasense_db
```

---

## 📖 Usage Guide

### Adding a Camera

1. Navigate to **Cameras** page
2. Click **Add Camera** button
3. Fill in the form:
   - **Camera Name**: e.g., "Front Gate Camera"
   - **RTSP URL**: `rtsp://username:password@ip:port/stream`
   - **Location**: Physical location
   - **Confidence Threshold**: Adjust slider (default 31%)
   - **AI Model**: Select detection model (General, PPE, Fire, etc.)
   - **Allowed Classes**: Select objects to detect
4. Click **Add Camera**

### Drawing ROI (Restricted Zones)

1. Go to **Cameras** page
2. Click on a camera card's settings icon
3. Navigate to **ROI Configuration** tab
4. Enter ROI name and select color
5. Click **Start Drawing**
6. Click on the video to create polygon points
7. Click **Complete** when done
8. Click **Save ROI**

### Configuring Email Alerts

1. Open camera settings
2. Go to **Alert Settings** tab
3. Enable **Email Alerts** toggle
4. Enter email recipients (comma-separated)
5. Adjust detection interval
6. Click **Save Alert Settings**

### Viewing Live Monitoring

1. Navigate to **Live Monitoring** page
2. View all active camera feeds in grid layout
3. Click **Maximize** on any feed for fullscreen view

### Checking Detection Logs

1. Go to **Detections** page
2. View all violations in table format
3. Click eye icon to view detection image
4. Use search to filter detections
5. Export data using **Export CSV** button

---

## 📁 Project Structure

```
vivyasense_admin/
├── backend/
│   ├── main.py                      # FastAPI application
│   ├── config.py                    # Configuration settings
│   ├── database.py                  # Database connection
│   ├── models.py                    # SQLAlchemy models
│   ├── schemas.py                   # Pydantic schemas
│   ├── ai_service.py                # PyTorch YOLO detection service
│   ├── video_service.py             # Video streaming manager
│   ├── email_service.py             # Email notification service
│   ├── requirements.gpu.txt         # GPU dependencies
│   ├── requirements.cpu.txt         # CPU dependencies
│   └── routers/                     # API endpoints
│       ├── cameras.py
│       ├── rois.py
│       ├── detections.py
│       └── stream.py
├── frontend/
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── pages/                   # Page components
│   │   ├── services/                # API services
│   │   ├── App.jsx                  # Main app component
│   │   └── main.jsx                 # Entry point
│   ├── package.json
│   └── vite.config.js
├── start-local-gpu.bat/.sh          # Local GPU startup scripts
├── start-client-cpu.bat/.sh         # Client CPU startup scripts
└── README.md
```

---

## 🐛 Troubleshooting

### Camera Not Connecting
- Verify RTSP URL is correct: `rtsp://username:password@ip:port/stream`
- Check camera is accessible on network (ping the IP)
- Ensure credentials are correct
- Try accessing RTSP URL with VLC media player
- Check firewall settings

### Low FPS Performance

**For GPU deployment:**
- Verify GPU is detected: `nvidia-smi`
- Check CUDA is installed correctly
- Monitor GPU usage during inference

**For CPU deployment:**
- Reduce number of cameras
- Lower camera resolution
- Increase confidence threshold (fewer detections = faster)

### Common Issues

**Port already in use:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Linux/macOS

# Kill the process or change port
```

### Email Not Sending
- Verify SMTP settings in `.env` file
- For Gmail, use App Password (not regular password)
- Check firewall allows outbound SMTP connections
- Test SMTP settings with a simple Python script

### Database Connection Error

- Ensure PostgreSQL is running
- Verify database exists: `psql -U postgres -l`
- Check DATABASE_URL in `.env` file
- Verify user permissions

---

## 🔄 Switching Between Deployments

You can switch between deployment options at any time:

**From GPU to CPU:**
1. Stop GPU backend (Ctrl+C)
2. Run `start-client-cpu.bat`

**From CPU to GPU:**
1. Stop CPU backend (Ctrl+C)
2. Run `start-local-gpu.bat`

---

## 📝 License

Copyright © 2024 VivyaSense. All rights reserved.

## 🤝 Support

For support, email support@vivyasense.com or open an issue in the repository.

---

## 🎯 Summary

**Two deployment options, one powerful platform:**

1. **Local GPU** - Maximum performance for development (60+ FPS)
2. **Client CPU** - Simple installation for basic needs (30-40 FPS)

Choose the deployment that best fits your hardware and requirements. Both deployments share the same features and capabilities - only the performance characteristics differ.

**Get started in 5 minutes!** 🚀

