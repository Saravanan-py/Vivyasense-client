# Factory Productivity Monitoring System

## ✅ **Implementation Complete!**

I've successfully created a comprehensive factory productivity monitoring system that tracks machine downtime and productivity by detecting steel presence in ROI zones.

---

## 🎯 **Features Implemented**

### **1. Video Upload & Model Selection**
- Upload video files for analysis
- Select detection model (best_asian1.pt for steel detection)
- Support for multiple video formats

### **2. ROI Drawing (Up to 3 Machines)**
- Interactive ROI drawing on video preview
- Draw polygonal ROIs by clicking points
- Support for up to 3 ROIs (one per machine)
- Visual feedback with color coding:
  - **Yellow**: ROI being drawn
  - **Red**: No steel detected (downtime/idle)
  - **Green**: Steel detected (productive)

### **3. Real-time Timer Display**
- Timer displayed at top of video frame
- Format: MM:SS.mmm (minutes:seconds.milliseconds)
- Tracks video playback time

### **4. Productivity Tracking**
- **Red ROI State**: Timer STARTS when no steel is detected (downtime/idle)
- **Green ROI State**: Timer STOPS when steel appears (productive)
- Tracks downtime periods with start and end times
- Calculates productivity metrics per machine
- Console logs show when timer starts/stops with timestamps

### **5. Excel Report Generation**
- Comprehensive productivity report
- Per-machine statistics:
  - Total downtime
  - Productive time
  - Efficiency percentage
  - Number of downtime events
- Detailed downtime periods table with:
  - Event number
  - Start time
  - End time
  - Duration
- Professional formatting with headers and styling

### **6. Processed Video Download**
- Download video with ROI overlays
- Visual indicators showing machine states
- Timer overlay on video

---

## 📁 **Files Created/Modified**

### **Frontend:**
- ✅ `frontend/src/pages/FactoryProductivity.jsx` - Main productivity monitoring page
- ✅ `frontend/src/App.jsx` - Added route for /productivity
- ✅ `frontend/src/components/Layout.jsx` - Added navigation menu item

### **Backend:**
- ✅ `backend/routers/productivity.py` - Video processing and Excel generation
- ✅ `backend/main.py` - Included productivity router
- ✅ `backend/config.py` - Added productivity uploads directory
- ✅ `backend/requirements.txt` - Added openpyxl dependency

---

## 🚀 **How to Use**

### **Step 1: Install Dependencies**
```bash
cd backend
pip install openpyxl==3.1.2
```

### **Step 2: Add Steel Detection Model**
Place your `best_asian1.pt` model in the `backend/models/` directory:
```bash
# Copy your model to:
backend/models/best_asian1.pt
```

### **Step 3: Restart Backend**
```bash
cd backend
python main.py
```

### **Step 4: Access the Page**
1. Open browser to `http://localhost:3000`
2. Click **"Factory Productivity"** in the sidebar menu

### **Step 5: Upload Video**
1. Click "Select Video File" and choose your factory video
2. Select "Steel Detection Model (best_asian1.pt)" from dropdown

### **Step 6: Draw ROIs**
1. Click **"Draw ROI 1"** button
2. Click on the video to create polygon points (minimum 3 points)
3. Click **"Complete ROI"** when done
4. Repeat for Machine 2 and Machine 3 (up to 3 ROIs total)
5. ROIs will appear in **RED** (indicating no steel initially)

### **Step 7: Process Video**
1. Click **"Start Processing"** button
2. Wait for video processing to complete
3. View results showing:
   - Total downtime per machine
   - Productive time per machine
   - Efficiency percentage
   - Number of downtime events

### **Step 8: Download Reports**
1. Click **"Download Excel Report"** for detailed analytics
2. Click **"Download Processed Video"** to get annotated video

---

## 📊 **How It Works**

### **ROI Color Logic:**

```
Initial State: RED (no steel detected) → TIMER STARTS
↓
Console: "⏱️  Machine 1: TIMER STARTED - No steel detected at 0.00s"
↓
Steel Detected in ROI → Changes to GREEN → TIMER STOPS
↓
Console: "⏱️  Machine 1: TIMER STOPPED - Steel detected! Downtime: 15.50s (from 0.00s to 15.50s)"
↓
Steel Leaves ROI → Changes to RED → TIMER STARTS
↓
Console: "⏱️  Machine 1: TIMER STARTED - No steel detected at 45.30s"
↓
Downtime Period Recorded: {start_time, end_time, duration}
```

### **Detection Logic:**
1. Each frame is analyzed using the steel detection model
2. For each ROI, check if any detected object's center point is inside the ROI polygon
3. If steel is detected → ROI turns GREEN
4. If no steel → ROI turns RED and downtime timer runs
5. All downtime periods are logged with timestamps

### **Excel Report Structure:**
```
Factory Productivity Report
├── Video Summary
│   ├── Duration
│   ├── Total Frames
│   ├── FPS
│   └── Generated Date
├── Machine 1 Statistics
│   ├── Metrics (Downtime, Productive Time, Efficiency)
│   └── Downtime Periods Table
├── Machine 2 Statistics
│   └── ...
└── Machine 3 Statistics
    └── ...
```

---

## 🎨 **Visual Features**

### **On Video Frame:**
- **Timer**: Top-left corner with black background
- **ROI Overlays**: Semi-transparent colored polygons
- **Machine Labels**: "Machine 1", "Machine 2", "Machine 3"
- **Status Labels**: "ACTIVE" (green) or "IDLE" (red)

### **Color Scheme:**
- 🔴 **Red ROI**: No steel detected (downtime)
- 🟢 **Green ROI**: Steel detected (productive)
- 🟡 **Yellow ROI**: Currently being drawn
- ⏱️ **Cyan Timer**: Video timestamp

---

## 📈 **Productivity Metrics**

### **Calculated for Each Machine:**

1. **Total Downtime**: Sum of all red periods (seconds)
2. **Productive Time**: Total video duration - Total downtime
3. **Efficiency**: (Productive Time / Total Duration) × 100%
4. **Downtime Count**: Number of times machine went idle

### **Example Output:**
```json
{
  "roi_id": 0,
  "total_downtime": 45.5,
  "productive_time": 254.5,
  "efficiency": 84.83,
  "downtime_count": 3,
  "downtime_periods": [
    {"start": 10.5, "end": 25.3, "duration": 14.8},
    {"start": 120.0, "end": 135.2, "duration": 15.2},
    {"start": 280.0, "end": 295.5, "duration": 15.5}
  ]
}
```

---

## 🔧 **Technical Details**

### **Backend Processing:**
- Uses OpenCV for video processing
- YOLO model for steel detection
- Point-in-polygon algorithm for ROI checking
- Frame-by-frame analysis with state tracking
- MP4 video output with H.264 codec

### **Frontend:**
- React with hooks (useState, useEffect, useRef)
- HTML5 Canvas for ROI drawing
- Axios for API calls
- Real-time visual feedback

### **API Endpoints:**
- `POST /api/productivity/process` - Process video with ROIs
- `GET /api/productivity/download-excel` - Download Excel report

---

## ⚠️ **Important Notes**

1. **Model Requirement**: Make sure `best_asian1.pt` is in `backend/models/` directory
2. **Video Format**: Supports MP4, AVI, MOV, and other common formats
3. **Processing Time**: Depends on video length and resolution
4. **ROI Limit**: Maximum 3 ROIs (for 3 machines)
5. **Minimum Points**: Each ROI must have at least 3 points

---

## 🎯 **Console Output**

During processing, you'll see console logs like:
```
Processing video: 7500 frames at 30 FPS
⏱️  Machine 1: TIMER STARTED - No steel detected at 0.00s
⏱️  Machine 2: TIMER STARTED - No steel detected at 0.00s
⏱️  Machine 3: TIMER STARTED - No steel detected at 0.00s
Processed 100/7500 frames
⏱️  Machine 1: TIMER STOPPED - Steel detected! Downtime: 3.33s (from 0.00s to 3.33s)
Processed 200/7500 frames
⏱️  Machine 2: TIMER STOPPED - Steel detected! Downtime: 5.67s (from 0.00s to 5.67s)
⏱️  Machine 1: TIMER STARTED - No steel detected at 8.50s
...
Video processing complete: 7500 frames processed
Excel report generated: uploads/productivity/.../productivity_report.xlsx
```

---

## 📝 **Next Steps**

1. **Install openpyxl**: `pip install openpyxl==3.1.2`
2. **Add your model**: Copy `best_asian1.pt` to `backend/models/`
3. **Restart backend**: `python main.py`
4. **Test the system**: Upload a test video and draw ROIs
5. **Review reports**: Check Excel output for accuracy

---

**All features implemented and ready to use!** 🎉

The system will help you track factory productivity by monitoring when steel is present at each machine, automatically calculating downtime and generating comprehensive reports.

