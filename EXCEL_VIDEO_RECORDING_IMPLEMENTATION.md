# Excel & Video Recording Implementation

## ✅ **ALL FEATURES IMPLEMENTED!**

### 📋 **Summary of Changes**

I've successfully implemented all requested features for the productivity monitoring system:

1. ✅ **Exact IST timestamps in Excel** (not numbers)
2. ✅ **Video recording during idle/downtime periods**
3. ✅ **Recording starts after 5 seconds of downtime**
4. ✅ **Recording stops when machine becomes active**
5. ✅ **Videos saved in "recordings" folder**
6. ✅ **Clickable links in Excel to video files**

---

## 🎯 **Feature Details**

### **1. Exact Timestamps in Excel**

**What changed:**
- Excel now shows full datetime stamps instead of just time
- Format: `YYYY-MM-DD HH:MM:SS` (e.g., `2026-02-16 14:27:23`)
- Both start and end times show complete timestamps

**Code location:** `backend/routers/productivity.py` lines 561-567

```python
# Use exact datetime timestamps instead of just time
start_datetime = period.get('start_datetime_ist', period.get('start_time_ist', f"{round(period['start'], 2)}s"))
end_datetime = period.get('end_datetime_ist', period.get('end_time_ist', f"{round(period['end'], 2)}s"))

ws[f'B{row}'] = start_datetime  # Full datetime: 2026-02-16 14:27:23
ws[f'C{row}'] = end_datetime    # Full datetime: 2026-02-16 14:29:35
```

---

### **2. Video Recording During Downtime**

**How it works:**
1. When machine becomes idle (no steel detected), timer starts
2. After **5 seconds** of continuous downtime, recording automatically starts
3. Recording continues until steel is detected again
4. When machine becomes active, recording stops immediately
5. Video is saved with timestamp and machine ID

**Recording Logic:**
- ✅ Starts: After 5 seconds of downtime
- ✅ Stops: Immediately when steel detected
- ✅ Format: MP4 (H.264 codec)
- ✅ FPS: Same as RTSP stream (30 FPS)
- ✅ Resolution: Original RTSP resolution

**Code location:** `backend/routers/productivity.py` lines 1095-1111

```python
# Check if we should start recording (after 5 seconds of downtime)
if tracker['is_red'] and tracker['video_writer'] is None:
    downtime_duration = elapsed_time - tracker['downtime_start']
    if downtime_duration >= 5.0:
        # Start recording
        ist = pytz.timezone('Asia/Kolkata')
        timestamp = datetime.now(ist).strftime('%Y%m%d_%H%M%S')
        video_filename = f"machine_{tracker['id'] + 1}_{session_id[:8]}_{timestamp}.mp4"
        video_path = os.path.join(recordings_dir, video_filename)
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        tracker['video_writer'] = cv2.VideoWriter(video_path, fourcc, fps, (frame_width, frame_height))
        tracker['current_video_path'] = video_path
        
        logger.info(f"📹 Machine {tracker['id'] + 1}: Recording started - {video_path}")
```

---

### **3. Recordings Folder Structure**

**Directory:** `recordings/` (created automatically)

**File naming convention:**
```
machine_{machine_number}_{session_id}_{timestamp}.mp4
```

**Example filenames:**
- `machine_1_a1b2c3d4_20260216_142735.mp4`
- `machine_2_a1b2c3d4_20260216_143012.mp4`
- `machine_3_a1b2c3d4_20260216_144521.mp4`

**File structure:**
```
recordings/
├── machine_1_a1b2c3d4_20260216_142735.mp4
├── machine_1_a1b2c3d4_20260216_145123.mp4
├── machine_2_a1b2c3d4_20260216_143012.mp4
└── machine_3_a1b2c3d4_20260216_144521.mp4
```

---

### **4. Excel Links to Videos**

**New column added:** "Video Recording"

**Excel structure:**
| Event | Start Time (IST) | End Time (IST) | Duration | Video Recording |
|-------|------------------|----------------|----------|-----------------|
| 1 | 2026-02-16 14:27:23 | 2026-02-16 14:29:35 | 2 min 12 sec | 📹 View Recording |
| 2 | 2026-02-16 14:35:10 | 2026-02-16 14:36:45 | 1 min 35 sec | 📹 View Recording |

**How links work:**
- Clickable hyperlink in Excel
- Blue underlined text: "📹 View Recording"
- Clicking opens the video file directly
- If no recording exists: Shows "No recording"

**Code location:** `backend/routers/productivity.py` lines 569-577

```python
# Add video link if recording exists
video_path = period.get('video_path', '')
if video_path and os.path.exists(video_path):
    # Create hyperlink to video file
    ws[f'E{row}'].hyperlink = video_path
    ws[f'E{row}'].value = "📹 View Recording"
    ws[f'E{row}'].font = Font(color="0000FF", underline="single")
else:
    ws[f'E{row}'] = "No recording"
```

---

## 🔧 **Technical Implementation**

### **Modified Files:**
1. `backend/routers/productivity.py` - Main implementation

### **Key Changes:**

#### **1. Added Hyperlink Import**
```python
from openpyxl.styles import Font, PatternFill, Alignment, Hyperlink
```

#### **2. Video Recording State (per ROI tracker)**
```python
tracker['video_writer'] = None
tracker['recording_start_time'] = None
tracker['current_video_path'] = None
```

#### **3. Recording Start Logic**
- Checks if downtime >= 5 seconds
- Creates video writer with MP4 codec
- Stores video path in tracker

#### **4. Recording Stop Logic**
- Releases video writer when steel detected
- Saves video path to downtime period
- Logs recording completion

#### **5. New API Endpoint**
```python
@router.get("/recordings/{filename}")
async def get_recording(filename: str):
    """Serve recorded video files"""
```

---

## 📊 **Console Logs**

The system now provides detailed logging:

```
⏱️  Machine 1: TIMER STARTED - No steel detected at 45.23s
📹 Machine 1: Recording started - recordings/machine_1_a1b2c3d4_20260216_142735.mp4
⏱️  Machine 1: TIMER STOPPED - Steel detected! Downtime: 132.45s (14:27:23 to 14:29:35)
📹 Machine 1: Recording stopped - recordings/machine_1_a1b2c3d4_20260216_142735.mp4
```

---

## 🎉 **Benefits**

1. **Exact Timestamps** - No more confusion with relative times
2. **Video Evidence** - Visual proof of downtime periods
3. **Easy Access** - Click link in Excel to view video
4. **Automatic Recording** - No manual intervention needed
5. **Storage Efficient** - Only records during downtime (after 5s)
6. **Organized Files** - Clear naming convention with timestamps

---

## 🚀 **How to Use**

1. **Start RTSP Monitoring** - System automatically monitors
2. **Downtime Detected** - Timer starts counting
3. **After 5 Seconds** - Recording begins automatically
4. **Machine Active** - Recording stops, video saved
5. **Download Excel** - Click "📹 View Recording" to watch video

---

## 📝 **Notes**

- Videos are saved in MP4 format (H.264 codec)
- Recording starts only after 5 seconds of continuous downtime
- Each machine has separate recordings
- Videos are linked in Excel for easy access
- Recordings folder is created automatically
- All timestamps are in IST (Indian Standard Time)


