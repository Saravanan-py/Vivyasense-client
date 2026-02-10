from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from fastapi.responses import FileResponse, StreamingResponse, Response
import cv2
import numpy as np
import json
import os
import uuid
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from ai_service import ai_service
import threading
import time

router = APIRouter(prefix="/api/productivity", tags=["productivity"])
logger = logging.getLogger(__name__)

# Store session data temporarily
sessions = {}

# Store active RTSP sessions
rtsp_sessions = {}

@router.post("/process")
async def process_video(
    video: UploadFile = File(...),
    model: str = Form(...),
    rois: str = Form(...)
):
    """Process uploaded video with ROI monitoring for factory productivity"""
    
    session_id = str(uuid.uuid4())
    temp_dir = f"uploads/productivity/{session_id}"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save uploaded video
    video_path = f"{temp_dir}/input.mp4"
    with open(video_path, "wb") as f:
        f.write(await video.read())
    
    # Parse ROIs
    roi_list = json.loads(rois)
    
    # Process video
    try:
        result = process_factory_video(
            video_path=video_path,
            model_name=model,
            rois=roi_list,
            output_dir=temp_dir
        )
        
        # Store session data
        sessions[session_id] = result
        
        return {
            "session_id": session_id,
            "processed_video_url": f"/uploads/productivity/{session_id}/output.mp4",
            "productivity_data": result
        }
    
    except Exception as e:
        logger.error(f"Error processing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download-excel")
async def download_excel(session_id: str):
    """Download Excel report for productivity data"""

    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    data = sessions[session_id]

    # Save to excel_reports folder
    excel_dir = "excel_reports"
    os.makedirs(excel_dir, exist_ok=True)
    excel_path = f"{excel_dir}/productivity_report_{session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    # Generate Excel file
    generate_excel_report(data, excel_path)

    return FileResponse(
        excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"productivity_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    )


def process_factory_video(video_path: str, model_name: str, rois: List[List[Dict]], output_dir: str) -> Dict:
    """
    Process video with steel detection and ROI monitoring
    
    Returns productivity data with downtime tracking
    """
    
    # Load model
    model_path = f"models/{model_name}"
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}")
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Failed to open video file")
    
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Output video writer
    output_path = f"{output_dir}/output.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Initialize ROI tracking
    roi_trackers = []
    for i, roi in enumerate(rois):
        roi_trackers.append({
            'id': i,
            'roi': roi,
            'is_red': True,  # Start as red (no steel)
            'downtime_start': 0,  # Frame number when downtime started
            'downtime_periods': [],  # List of (start_time, end_time) tuples
            'total_downtime': 0,
            'productive_time': 0
        })
    
    frame_count = 0
    logger.info(f"Processing video: {total_frames} frames at {fps} FPS")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Run detection
        detections = ai_service.detect_objects(frame, model_name, confidence=0.3)
        
        # Check each ROI for steel presence
        for tracker in roi_trackers:
            roi_points = np.array([[p['x'], p['y']] for p in tracker['roi']], dtype=np.int32)
            steel_detected = False
            
            # Check if any detection is inside this ROI
            for detection in detections:
                bbox = detection['bbox']
                center_x = (bbox[0] + bbox[2]) / 2
                center_y = (bbox[1] + bbox[3]) / 2
                
                # Check if center point is inside ROI polygon
                if cv2.pointPolygonTest(roi_points, (center_x, center_y), False) >= 0:
                    steel_detected = True
                    break
            
            # Update ROI state
            current_time = frame_count / fps
            
            if steel_detected:
                # Steel present - ROI should be green, TIMER STOPS
                if tracker['is_red']:
                    # Transition from red to green - end downtime period
                    downtime_end = current_time
                    downtime_start_time = tracker['downtime_start'] / fps
                    duration = downtime_end - downtime_start_time
                    tracker['downtime_periods'].append({
                        'start': downtime_start_time,
                        'end': downtime_end,
                        'duration': duration
                    })
                    tracker['total_downtime'] += duration

                    # Console output: Timer stopped
                    logger.info(f"⏱️  Machine {tracker['id'] + 1}: TIMER STOPPED - Steel detected! Downtime: {duration:.2f}s (from {downtime_start_time:.2f}s to {downtime_end:.2f}s)")
                tracker['is_red'] = False
            else:
                # No steel - ROI should be red, TIMER STARTS
                if not tracker['is_red']:
                    # Transition from green to red - start downtime period
                    tracker['downtime_start'] = frame_count

                    # Console output: Timer started
                    logger.info(f"⏱️  Machine {tracker['id'] + 1}: TIMER STARTED - No steel detected at {current_time:.2f}s")
                tracker['is_red'] = True
        
        # Draw ROIs and timer on frame
        frame = draw_rois_and_timer(frame, roi_trackers, frame_count, fps)
        
        out.write(frame)
        frame_count += 1
        
        if frame_count % 100 == 0:
            logger.info(f"Processed {frame_count}/{total_frames} frames")
    
    cap.release()
    out.release()

    # Handle final downtime periods (if video ends while in red state)
    video_duration = total_frames / fps
    for tracker in roi_trackers:
        if tracker['is_red']:
            downtime_start_time = tracker['downtime_start'] / fps
            tracker['downtime_periods'].append({
                'start': downtime_start_time,
                'end': video_duration,
                'duration': video_duration - downtime_start_time
            })
            tracker['total_downtime'] += (video_duration - downtime_start_time)

        tracker['productive_time'] = video_duration - tracker['total_downtime']

    # Calculate statistics
    roi_stats = []
    for tracker in roi_trackers:
        efficiency = (tracker['productive_time'] / video_duration * 100) if video_duration > 0 else 0
        roi_stats.append({
            'roi_id': tracker['id'],
            'total_downtime': round(tracker['total_downtime'], 2),
            'productive_time': round(tracker['productive_time'], 2),
            'efficiency': round(efficiency, 2),
            'downtime_count': len(tracker['downtime_periods']),
            'downtime_periods': tracker['downtime_periods']
        })

    logger.info(f"Video processing complete: {frame_count} frames processed")

    return {
        'session_id': output_dir.split('/')[-1],
        'video_duration': round(video_duration, 2),
        'total_frames': total_frames,
        'fps': fps,
        'roi_stats': roi_stats
    }


def draw_rois_and_timer(frame: np.ndarray, roi_trackers: List[Dict], frame_count: int, fps: int) -> np.ndarray:
    """Draw ROIs with color coding and timer on frame"""

    overlay = frame.copy()

    # Draw each ROI
    for tracker in roi_trackers:
        roi_points = np.array([[p['x'], p['y']] for p in tracker['roi']], dtype=np.int32)

        # Color based on state
        if tracker['is_red']:
            color = (0, 0, 255)  # Red (BGR)
            fill_color = (0, 0, 255, 80)  # Semi-transparent red
        else:
            color = (0, 255, 0)  # Green (BGR)
            fill_color = (0, 255, 0, 80)  # Semi-transparent green

        # Draw filled polygon
        cv2.fillPoly(overlay, [roi_points], color)

        # Draw border
        cv2.polylines(frame, [roi_points], True, color, 3)

        # Calculate center for label
        M = cv2.moments(roi_points)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
        else:
            cx = roi_points[0][0]
            cy = roi_points[0][1]

        # Draw label
        label = f"Machine {tracker['id'] + 1}"
        status = "IDLE" if tracker['is_red'] else "ACTIVE"

        cv2.putText(frame, label, (cx - 60, cy - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, status, (cx - 40, cy + 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    # Blend overlay with original frame
    frame = cv2.addWeighted(overlay, 0.3, frame, 0.7, 0)

    # Draw timer at top
    current_time = frame_count / fps
    minutes = int(current_time // 60)
    seconds = int(current_time % 60)
    milliseconds = int((current_time % 1) * 1000)

    timer_text = f"Time: {minutes:02d}:{seconds:02d}.{milliseconds:03d}"

    # Draw timer background
    cv2.rectangle(frame, (10, 10), (350, 60), (0, 0, 0), -1)
    cv2.rectangle(frame, (10, 10), (350, 60), (255, 255, 255), 2)

    # Draw timer text
    cv2.putText(frame, timer_text, (20, 45),
               cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 2)

    return frame


def generate_excel_report(data: Dict, output_path: str):
    """Generate Excel report with productivity data"""

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Productivity Report"

    # Header styling
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)

    # Title
    ws['A1'] = "Factory Productivity Report"
    ws['A1'].font = Font(bold=True, size=16)
    ws.merge_cells('A1:F1')

    # Summary
    ws['A3'] = "Video Duration:"
    ws['B3'] = f"{data['video_duration']} seconds"
    ws['A4'] = "Total Frames:"
    ws['B4'] = data['total_frames']
    ws['A5'] = "FPS:"
    ws['B5'] = data['fps']
    ws['A6'] = "Generated:"
    ws['B6'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Machine statistics
    row = 9
    for stat in data['roi_stats']:
        ws[f'A{row}'] = f"Machine {stat['roi_id'] + 1} Statistics"
        ws[f'A{row}'].font = Font(bold=True, size=14)
        ws.merge_cells(f'A{row}:F{row}')
        row += 1

        # Stats table
        ws[f'A{row}'] = "Metric"
        ws[f'B{row}'] = "Value"
        ws[f'A{row}'].fill = header_fill
        ws[f'B{row}'].fill = header_fill
        ws[f'A{row}'].font = header_font
        ws[f'B{row}'].font = header_font
        row += 1

        ws[f'A{row}'] = "Total Downtime"
        ws[f'B{row}'] = f"{stat['total_downtime']} seconds"
        row += 1

        ws[f'A{row}'] = "Productive Time"
        ws[f'B{row}'] = f"{stat['productive_time']} seconds"
        row += 1

        ws[f'A{row}'] = "Efficiency"
        ws[f'B{row}'] = f"{stat['efficiency']}%"
        row += 1

        ws[f'A{row}'] = "Downtime Events"
        ws[f'B{row}'] = stat['downtime_count']
        row += 2

        # Downtime periods table
        if stat['downtime_periods']:
            ws[f'A{row}'] = "Downtime Periods"
            ws[f'A{row}'].font = Font(bold=True)
            row += 1

            ws[f'A{row}'] = "Event #"
            ws[f'B{row}'] = "Start Time (s)"
            ws[f'C{row}'] = "End Time (s)"
            ws[f'D{row}'] = "Duration (s)"
            for col in ['A', 'B', 'C', 'D']:
                ws[f'{col}{row}'].fill = header_fill
                ws[f'{col}{row}'].font = header_font
            row += 1

            for i, period in enumerate(stat['downtime_periods'], 1):
                ws[f'A{row}'] = i
                ws[f'B{row}'] = round(period['start'], 2)
                ws[f'C{row}'] = round(period['end'], 2)
                ws[f'D{row}'] = round(period['duration'], 2)
                row += 1

        row += 2

    # Adjust column widths
    ws.column_dimensions['A'].width = 20
    ws.column_dimensions['B'].width = 20
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 15

    wb.save(output_path)
    logger.info(f"Excel report generated: {output_path}")


# ==================== RTSP ENDPOINTS ====================

@router.post("/rtsp/connect")
async def connect_to_rtsp(data: Dict = Body(...)):
    """Connect to RTSP stream and get first frame for ROI drawing"""

    rtsp_url = data.get('rtsp_url')

    if not rtsp_url:
        raise HTTPException(status_code=400, detail="RTSP URL is required")

    try:
        # Open RTSP stream with optimized settings
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

        # Set timeouts and buffer settings
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)  # 10 second timeout for connection
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000)  # 10 second timeout for reading
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Failed to connect to RTSP stream. Check URL and network connection.")

        # Try to read first frame (may need multiple attempts due to buffering)
        ret = False
        frame = None
        max_attempts = 10

        for attempt in range(max_attempts):
            ret, frame = cap.read()
            if ret:
                break
            time.sleep(0.5)

        cap.release()

        if not ret or frame is None:
            raise HTTPException(status_code=400, detail="Failed to read frame from RTSP stream. Stream may be unavailable.")

        # Save frame temporarily
        temp_id = str(uuid.uuid4())
        temp_dir = "uploads/productivity/temp"
        os.makedirs(temp_dir, exist_ok=True)
        frame_path = f"{temp_dir}/{temp_id}.jpg"
        cv2.imwrite(frame_path, frame)

        return {
            "message": "Connected to RTSP stream",
            "frame_url": f"/api/productivity/temp-frame/{temp_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to RTSP: {str(e)}")


@router.get("/temp-frame/{frame_id}")
async def get_temp_frame(frame_id: str):
    """Get temporary frame for ROI drawing"""

    frame_path = f"uploads/productivity/temp/{frame_id}.jpg"

    if not os.path.exists(frame_path):
        raise HTTPException(status_code=404, detail="Frame not found")

    return FileResponse(frame_path, media_type="image/jpeg")


@router.post("/rtsp/start")
async def start_rtsp_monitoring(data: Dict = Body(...)):
    """Start RTSP stream monitoring with ROI tracking"""

    rtsp_url = data.get('rtsp_url')
    model_name = data.get('model')
    rois = data.get('rois')

    if not rtsp_url or not model_name or not rois:
        raise HTTPException(status_code=400, detail="Missing required parameters")

    session_id = str(uuid.uuid4())

    # Initialize session data
    rtsp_sessions[session_id] = {
        'rtsp_url': rtsp_url,
        'model_name': model_name,
        'rois': rois,
        'is_active': True,
        'start_time': time.time(),
        'frame_count': 0,
        'latest_frame': None,
        'roi_trackers': [],
        'stop_requested': False
    }

    # Initialize ROI trackers
    for i, roi in enumerate(rois):
        rtsp_sessions[session_id]['roi_trackers'].append({
            'id': i,
            'roi': roi,
            'is_red': True,  # Start as red (no steel)
            'downtime_start': 0,
            'downtime_periods': [],
            'total_downtime': 0,
            'productive_time': 0,
            'current_downtime': 0
        })

    # Start RTSP processing thread
    thread = threading.Thread(
        target=process_rtsp_stream,
        args=(session_id,),
        daemon=True
    )
    thread.start()

    logger.info(f"Started RTSP monitoring session: {session_id}")

    return {
        "session_id": session_id,
        "message": "RTSP monitoring started"
    }


@router.post("/rtsp/stop/{session_id}")
async def stop_rtsp_monitoring(session_id: str):
    """Stop RTSP stream monitoring and generate report"""

    if session_id not in rtsp_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = rtsp_sessions[session_id]
    session['stop_requested'] = True
    session['is_active'] = False

    # Wait a moment for thread to finish
    time.sleep(2)

    # Calculate final statistics
    elapsed_time = time.time() - session['start_time']

    for tracker in session['roi_trackers']:
        # Handle final downtime period if still red
        if tracker['is_red']:
            downtime_duration = elapsed_time - tracker['downtime_start']
            tracker['downtime_periods'].append({
                'start': tracker['downtime_start'],
                'end': elapsed_time,
                'duration': downtime_duration
            })
            tracker['total_downtime'] += downtime_duration

        tracker['productive_time'] = elapsed_time - tracker['total_downtime']

    # Generate productivity data
    roi_stats = []
    for tracker in session['roi_trackers']:
        efficiency = (tracker['productive_time'] / elapsed_time * 100) if elapsed_time > 0 else 0
        roi_stats.append({
            'roi_id': tracker['id'],
            'total_downtime': round(tracker['total_downtime'], 2),
            'productive_time': round(tracker['productive_time'], 2),
            'efficiency': round(efficiency, 2),
            'downtime_count': len(tracker['downtime_periods']),
            'downtime_periods': tracker['downtime_periods']
        })

    productivity_data = {
        'session_id': session_id,
        'video_duration': round(elapsed_time, 2),
        'total_frames': session['frame_count'],
        'fps': round(session['frame_count'] / elapsed_time, 2) if elapsed_time > 0 else 0,
        'roi_stats': roi_stats
    }

    # Store in sessions for Excel download
    sessions[session_id] = productivity_data

    # Generate Excel report
    excel_dir = "excel_reports"
    os.makedirs(excel_dir, exist_ok=True)
    excel_path = f"{excel_dir}/productivity_report_{session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    generate_excel_report(productivity_data, excel_path)

    logger.info(f"Stopped RTSP monitoring session: {session_id}")

    return {
        "message": "RTSP monitoring stopped",
        "productivity_data": productivity_data
    }


@router.get("/rtsp/stats/{session_id}")
async def get_rtsp_stats(session_id: str):
    """Get live statistics for active RTSP session"""

    if session_id not in rtsp_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = rtsp_sessions[session_id]
    elapsed_time = time.time() - session['start_time']

    roi_stats = []
    for tracker in session['roi_trackers']:
        # Calculate current downtime if red
        current_downtime = 0
        if tracker['is_red']:
            current_downtime = elapsed_time - tracker['downtime_start']

        productive_time = elapsed_time - (tracker['total_downtime'] + current_downtime)

        roi_stats.append({
            'roi_id': tracker['id'],
            'is_red': tracker['is_red'],
            'current_downtime': round(current_downtime, 2),
            'total_downtime': round(tracker['total_downtime'], 2),
            'productive_time': round(productive_time, 2),
            'downtime_count': len(tracker['downtime_periods'])
        })

    return {
        'elapsed_time': round(elapsed_time, 2),
        'frame_count': session['frame_count'],
        'roi_stats': roi_stats
    }


@router.get("/rtsp/feed/{session_id}")
async def get_rtsp_feed(session_id: str):
    """Stream RTSP feed with ROI overlay - 50+ FPS (same as Live Monitoring page)"""

    if session_id not in rtsp_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    def generate_frames():
        """Generate video frames at 50+ FPS for ultra-smooth playback"""
        import time
        last_frame_time = time.time()

        # Target 50 FPS for smooth playback (same as Live Monitoring)
        target_fps = 50
        min_frame_interval = 1.0 / target_fps

        while session_id in rtsp_sessions and rtsp_sessions[session_id]['is_active']:
            current_time = time.time()

            # Minimal frame rate limiting for 50+ FPS
            elapsed = current_time - last_frame_time
            if elapsed < min_frame_interval:
                time.sleep(min_frame_interval - elapsed)

            session = rtsp_sessions[session_id]
            frame = session.get('latest_frame')

            if frame is None:
                time.sleep(0.001)  # 1ms delay (faster retry)
                continue

            # Fast JPEG encoding for 50+ FPS
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85, cv2.IMWRITE_JPEG_OPTIMIZE, 0]
            ret, buffer = cv2.imencode('.jpg', frame, encode_params)
            if not ret:
                continue

            # Yield frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

            last_frame_time = time.time()

    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


def process_rtsp_stream(session_id: str):
    """Process RTSP stream in background thread - optimized for maximum FPS"""

    session = rtsp_sessions[session_id]
    rtsp_url = session['rtsp_url']
    model_name = session['model_name']

    # Open RTSP stream with ultra-low latency settings (same as Live Monitoring)
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

    # Ultra-low latency RTSP settings
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimal buffer for low latency
    cap.set(cv2.CAP_PROP_FPS, 30)

    if not cap.isOpened():
        session['is_active'] = False
        return

    frame_count = 0
    start_time = time.time()
    last_detection_time = 0
    detection_interval = 0.5  # Run AI detection every 0.5 seconds (not every frame)

    # Cache for detection results
    cached_detections = []

    while session['is_active'] and not session['stop_requested']:
        # Read frame as fast as possible (no blocking)
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.001)  # 1ms delay on failure
            continue

        frame_count += 1
        session['frame_count'] = frame_count
        current_time = time.time()
        elapsed_time = current_time - start_time

        # Run AI detection only every 0.5 seconds (not every frame for maximum speed)
        if current_time - last_detection_time >= detection_interval:
            last_detection_time = current_time

            # Run steel detection using best_asian1.pt model
            cached_detections = ai_service.detect_objects(frame, model_name, confidence=0.3)

        # Check each ROI for steel presence (using cached detections)
        for tracker in session['roi_trackers']:
            roi_points = np.array([[p['x'], p['y']] for p in tracker['roi']], dtype=np.int32)
            steel_detected = False

            # Check if any steel detection is inside this ROI
            for detection in cached_detections:
                bbox = detection['bbox']
                center_x = (bbox[0] + bbox[2]) / 2
                center_y = (bbox[1] + bbox[3]) / 2

                # Check if center point is inside ROI polygon
                if cv2.pointPolygonTest(roi_points, (center_x, center_y), False) >= 0:
                    steel_detected = True
                    break

            # Update ROI state and timing
            if steel_detected:
                # Steel present - ROI should be green, TIMER STOPS
                if tracker['is_red']:
                    # Transition from red to green - end downtime period
                    downtime_end = elapsed_time
                    downtime_start_time = tracker['downtime_start']
                    duration = downtime_end - downtime_start_time
                    tracker['downtime_periods'].append({
                        'start': downtime_start_time,
                        'end': downtime_end,
                        'duration': duration
                    })
                    tracker['total_downtime'] += duration
                tracker['is_red'] = False
            else:
                # No steel - ROI should be red, TIMER STARTS
                if not tracker['is_red']:
                    # Transition from green to red - start downtime period
                    tracker['downtime_start'] = elapsed_time
                tracker['is_red'] = True

        # Draw ROIs and timer on EVERY frame (for smooth display)
        frame = draw_rois_and_timer(frame, session['roi_trackers'], frame_count, 30)

        # Store latest frame (atomic update)
        session['latest_frame'] = frame

        # NO SLEEP - Capture frames as fast as possible for maximum FPS

    cap.release()

