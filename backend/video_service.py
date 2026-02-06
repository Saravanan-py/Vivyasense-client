import cv2
import asyncio
import numpy as np
from typing import Dict, Optional, List
import threading
from datetime import datetime, timedelta
from ai_service import ai_service
from email_service import email_service
from line_crossing_service import LineCrossingDetector
from heatmap_service import HeatmapGenerator
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoStreamManager:
    def __init__(self):
        self.streams: Dict[int, 'VideoStream'] = {}
        self.lock = threading.Lock()

        # Detect if running on CPU or GPU
        self.is_cpu_mode = self._detect_cpu_mode()
        if self.is_cpu_mode:
            logger.info("🖥️  CPU mode detected - Enabling performance optimizations for multi-camera support")
    
    def _detect_cpu_mode(self):
        """Detect if running on CPU (no GPU available)"""
        try:
            import torch
            return not torch.cuda.is_available() and not torch.backends.mps.is_available()
        except:
            return True  # Assume CPU if torch not available

    def start_stream(self, camera_id: int, camera_config: dict, db_session):
        """Start video stream for a camera"""
        with self.lock:
            if camera_id in self.streams:
                self.stop_stream(camera_id)

            # Pass CPU mode info to stream
            camera_config['is_cpu_mode'] = self.is_cpu_mode
            camera_config['active_camera_count'] = len(self.streams)

            stream = VideoStream(camera_id, camera_config, db_session)
            self.streams[camera_id] = stream
            stream.start()
            logger.info(f"Started stream for camera {camera_id} (CPU mode: {self.is_cpu_mode}, Active cameras: {len(self.streams)})")
    
    def stop_stream(self, camera_id: int):
        """Stop video stream for a camera"""
        with self.lock:
            if camera_id in self.streams:
                self.streams[camera_id].stop()
                del self.streams[camera_id]
                logger.info(f"Stopped stream for camera {camera_id}")
    
    def get_frame(self, camera_id: int) -> Optional[np.ndarray]:
        """Get latest processed frame from camera"""
        with self.lock:
            if camera_id in self.streams:
                return self.streams[camera_id].get_latest_frame()
        return None

    def get_raw_frame(self, camera_id: int) -> Optional[np.ndarray]:
        """Get latest raw frame from camera (without AI annotations)"""
        with self.lock:
            if camera_id in self.streams:
                return self.streams[camera_id].get_raw_frame()
        return None

    def update_camera_config(self, camera_id: int, camera_config: dict):
        """Update camera configuration"""
        with self.lock:
            if camera_id in self.streams:
                self.streams[camera_id].update_config(camera_config)


class VideoStream:
    def __init__(self, camera_id: int, camera_config: dict, db_session):
        self.camera_id = camera_id
        self.camera_config = camera_config
        self.raw_frame = None  # Store raw frame without annotations
        self.db_session = db_session
        self.running = False
        self.capture_thread = None  # Dedicated thread for frame capture
        self.processing_thread = None  # Dedicated thread for frame processing
        self.latest_frame = None
        self.cap = None
        self.last_detection_time = {}
        self.frame_lock = threading.Lock()
        self.captured_frame = None  # Latest captured frame from camera
        self.capture_lock = threading.Lock()

        # Line crossing detector
        self.line_crossing_detector = LineCrossingDetector()

        # Heatmap generator (initialized when first frame is available)
        self.heatmap_generator = None
        self.heatmap_enabled = camera_config.get('heatmap_enabled', False)

    def start(self):
        """Start the video stream threads (capture + processing)"""
        self.running = True
        # Start capture thread first
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        # Start processing thread
        self.processing_thread = threading.Thread(target=self._processing_loop, daemon=True)
        self.processing_thread.start()

    def stop(self):
        """Stop the video stream and free up memory"""
        self.running = False
        if self.capture_thread:
            self.capture_thread.join(timeout=5)
        if self.processing_thread:
            self.processing_thread.join(timeout=5)
        if self.cap:
            self.cap.release()

        # Clear line crossing detector memory
        if hasattr(self, 'line_crossing_detector'):
            self.line_crossing_detector.reset_crossed_objects()

        # Clear AI model from memory if using GPU to prevent OOM
        # Only clear if this was the last active camera
        from ai_service import ai_service
        if ai_service.device == 'cuda:0':
            logger.info(f"Clearing GPU memory for camera {self.camera_id}")
            ai_service.clear_unused_models()
    
    def get_latest_frame(self) -> Optional[np.ndarray]:
        """Get the latest processed frame"""
        with self.frame_lock:
            return self.latest_frame.copy() if self.latest_frame is not None else None

    def get_raw_frame(self) -> Optional[np.ndarray]:
        """Get the latest raw frame without AI annotations"""
        with self.frame_lock:
            return self.raw_frame.copy() if self.raw_frame is not None else None

    def update_config(self, camera_config: dict):
        """Update camera configuration"""
        # Check if heatmap setting changed
        new_heatmap_enabled = camera_config.get('heatmap_enabled', False)
        if new_heatmap_enabled != self.heatmap_enabled:
            self.heatmap_enabled = new_heatmap_enabled
            if not new_heatmap_enabled:
                # Reset heatmap when disabled
                self.heatmap_generator = None
                logger.info(f"Heatmap disabled for camera {self.camera_id}")
            else:
                logger.info(f"Heatmap enabled for camera {self.camera_id}")

        self.camera_config = camera_config

    def _capture_loop(self):
        """OPTIMIZED RTSP CAPTURE - Maximum FPS with minimal latency"""
        import time

        rtsp_url = self.camera_config['rtsp_url']
        is_cpu_mode = self.camera_config.get('is_cpu_mode', False)

        logger.info(f"🚀 Initializing HIGH-PERFORMANCE capture for camera {self.camera_id}")

        # === STEP 1: Open video source with OPTIMIZED settings ===
        if rtsp_url == "0" or rtsp_url == 0:
            # Webcam - Simple and fast
            self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            logger.info(f"📹 Webcam opened: camera {self.camera_id}")
        else:
            # RTSP - OPTIMIZED FOR MAXIMUM FPS + LOW LATENCY
            # Balanced settings: Fast but reliable
            ffmpeg_options = (
                'rtsp_transport;tcp|'       # TCP for reliability (UDP was causing HEVC errors)
                'fflags;nobuffer|'          # Disable buffering
                'flags;low_delay|'          # Low delay mode
                'max_delay;500000|'         # 500ms max delay (was 0, too aggressive)
                'probesize;32|'             # Fast stream analysis
                'analyzeduration;0|'        # Skip analysis for speed
                'sync;ext'                  # External sync for smooth playback
            )
            os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = ffmpeg_options

            self.cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

            # OPTIMIZED buffer settings for maximum FPS
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimal buffer (1 frame)

            # Don't force codec - let FFMPEG auto-detect (fixes HEVC issues)
            # self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'H264'))

            logger.info(f"📡 RTSP opened with HIGH-PERFORMANCE mode: camera {self.camera_id}")

        if not self.cap.isOpened():
            logger.error(f"❌ Failed to open camera {self.camera_id}: {rtsp_url}")
            return

        # === STEP 2: OPTIMIZED frame capture loop - MAXIMUM FPS ===
        frame_count = 0
        last_fps_time = time.time()
        consecutive_failures = 0

        logger.info(f"✅ High-performance capture loop started for camera {self.camera_id}")

        while self.running:
            # SIMPLE AND FAST: Just read frames as fast as possible
            # Don't flush buffer - let OpenCV handle it with BUFFERSIZE=1
            ret, frame = self.cap.read()

            if not ret:
                consecutive_failures += 1
                if consecutive_failures > 10:
                    logger.warning(f"⚠️ Multiple frame read failures, reconnecting camera {self.camera_id}...")
                    self._reconnect_camera(rtsp_url)
                    consecutive_failures = 0
                # Small delay on failure to prevent CPU spinning
                time.sleep(0.001)
                continue

            consecutive_failures = 0  # Reset on success

            # Update frame atomically (no blocking)
            self.captured_frame = frame

            # FPS counter (every 60 frames)
            frame_count += 1
            if frame_count % 60 == 0:
                current_time = time.time()
                fps = 60 / (current_time - last_fps_time)
                logger.info(f"📊 Camera {self.camera_id} REAL-TIME capture FPS: {fps:.1f}")
                last_fps_time = current_time

            # NO SLEEP - Get frames as fast as possible for maximum FPS
            # BUFFERSIZE=1 ensures we always get recent frames

        # Cleanup
        if self.cap:
            self.cap.release()
            logger.info(f"🛑 Capture stopped for camera {self.camera_id}")

    def _reconnect_camera(self, rtsp_url):
        """Reconnect to camera with HIGH-PERFORMANCE settings"""
        import time

        if self.cap:
            self.cap.release()

        time.sleep(1)

        if rtsp_url == "0" or rtsp_url == 0:
            self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
        else:
            # Apply same HIGH-PERFORMANCE settings as initial connection
            ffmpeg_options = (
                'rtsp_transport;tcp|'
                'fflags;nobuffer|'
                'flags;low_delay|'
                'max_delay;500000|'
                'probesize;32|'
                'analyzeduration;0|'
                'sync;ext'
            )
            os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = ffmpeg_options
            self.cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimal buffer

        if self.cap.isOpened():
            logger.info(f"✅ Reconnected camera {self.camera_id} with HIGH-PERFORMANCE mode")
        else:
            logger.error(f"❌ Reconnection failed for camera {self.camera_id}")
            time.sleep(5)

    def _processing_loop(self):
        """NEW OPTIMIZED PROCESSING - Works with new capture system"""
        import time

        custom_model = self.camera_config.get('custom_model', 'general_detection')
        is_raw_stream = (custom_model == 'raw_stream')
        is_cpu_mode = self.camera_config.get('is_cpu_mode', False)

        # Set target FPS
        if is_cpu_mode:
            target_fps = 25 if not is_raw_stream else 40
        else:
            target_fps = 60  # GPU mode: 60 FPS

        target_interval = 1.0 / target_fps

        logger.info(f"🎬 Processing loop started: camera {self.camera_id}, model={custom_model}, target={target_fps} FPS")

        frame_counter = 0
        last_processed_frame = None

        while self.running:
            start_time = time.time()

            # Get latest frame (simple, no locks needed - atomic read)
            frame = self.captured_frame

            if frame is None:
                time.sleep(0.01)  # Wait for first frame
                continue

            # Make a copy for processing
            frame = frame.copy()

            # Process frame based on model type
            if is_raw_stream:
                # Raw stream: No AI processing, just pass through
                processed_frame = frame
            else:
                # AI processing
                if is_cpu_mode:
                    # CPU mode: Process every 2nd frame to reduce load
                    frame_counter += 1
                    if frame_counter % 2 == 0:
                        processed_frame = self._process_frame(frame)
                        last_processed_frame = processed_frame
                    else:
                        # Reuse last frame
                        processed_frame = last_processed_frame if last_processed_frame is not None else self._process_frame(frame)
                else:
                    # GPU mode: Process every frame
                    processed_frame = self._process_frame(frame)

            # Update latest frame
            with self.frame_lock:
                self.latest_frame = processed_frame
                self.raw_frame = frame

            # Frame rate control
            processing_time = time.time() - start_time
            sleep_time = max(0, target_interval - processing_time)

            if sleep_time > 0:
                time.sleep(sleep_time)
    
    def _process_frame(self, frame: np.ndarray) -> np.ndarray:
        """Process frame with AI detection"""
        # Get camera settings
        custom_model = self.camera_config.get('custom_model', 'general_detection')
        confidence = self.camera_config.get('confidence_threshold', 0.31)
        allowed_classes = self.camera_config.get('allowed_classes', [])
        rois = self.camera_config.get('rois', [])
        enable_people_counting = self.camera_config.get('enable_people_counting', False)
        roi_enabled = self.camera_config.get('roi_enabled', False)
        is_cpu_mode = self.camera_config.get('is_cpu_mode', False)
        active_camera_count = self.camera_config.get('active_camera_count', 1)

        # If raw stream model, return frame without any AI processing
        if custom_model == 'raw_stream':
            return frame

        # CPU mode optimization: Reduce resolution for AI processing (faster inference)
        original_width = None
        original_height = None
        if is_cpu_mode:
            height, width = frame.shape[:2]
            original_width = width
            original_height = height

            # Resize to 640 width for AI processing (2-3x faster on CPU)
            if width > 640:
                scale = 640 / width
                new_width = 640
                new_height = int(height * scale)
                frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
                logger.debug(f"CPU mode: Resized frame from {original_width}x{original_height} to {new_width}x{new_height} for AI processing")

        # Standard detection with CPU mode optimization
        all_detections = ai_service.detect_objects(frame, custom_model, confidence, allowed_classes, is_cpu_mode=is_cpu_mode)

        # Check if we have active ROIs with intrusion detection
        active_intrusion_rois = [roi for roi in rois if roi.get('is_active', True) and roi.get('alert_enabled', True)]

        # Check if ROI filtering is enabled (for people counting or intrusion detection)
        roi_filtering_enabled = (roi_enabled and rois) or active_intrusion_rois

        # Filter detections based on ROI intrusion detection
        detections_to_show = []
        violations = []

        # Check for fire/smoke detection (always alert, no ROI required)
        fire_smoke_classes = ['smoke', 'fire']
        for detection in all_detections:
            if detection['class'].lower() in fire_smoke_classes:
                detections_to_show.append(detection)
                violation = {
                    'violation_type': 'Fire Detection' if detection['class'].lower() == 'fire' else 'Smoke Detection',
                    'object_class': detection['class'],
                    'confidence': detection['confidence'],
                    'bbox': detection['bbox'],
                    'roi_name': self.camera_config.get('location', 'Unknown Location')
                }
                violations.append(violation)
                # Save detection and send alert
                self._handle_violation(frame, violation)

        if roi_filtering_enabled:
            # If ROI filtering is enabled, only show detections inside ROIs
            for detection in all_detections:
                # Skip fire/smoke as they're already handled
                if detection['class'].lower() in fire_smoke_classes:
                    continue

                # Check if detection is inside any active ROI
                for roi in rois:
                    if roi.get('is_active', True) and ai_service.check_roi_violation(detection['bbox'], roi['coordinates']):
                        detections_to_show.append(detection)
                        # Don't save intrusion detection logs - only show visually
                        break  # Don't check other ROIs for this detection
        else:
            # No ROI filtering - show all detections (except fire/smoke already handled)
            for detection in all_detections:
                if detection['class'].lower() not in fire_smoke_classes:
                    detections_to_show.append(detection)

        # Count persons inside ROI if people counting is enabled
        person_count = 0
        if enable_people_counting and roi_enabled and rois:
            # Count persons inside the first ROI
            roi = rois[0] if rois else None
            if roi:
                for detection in all_detections:
                    if detection['class'].lower() == 'person':
                        # Check if person is inside ROI
                        if ai_service.check_roi_violation(detection['bbox'], roi['coordinates']):
                            person_count += 1

        # Draw detections and ROIs
        processed_frame = ai_service.draw_detections(frame, detections_to_show, rois, violations)

        # Draw person count if enabled
        if enable_people_counting and roi_enabled and rois:
            # Draw person count at the top left of the frame
            cv2.rectangle(processed_frame, (10, 10), (250, 60), (0, 0, 0), -1)
            cv2.rectangle(processed_frame, (10, 10), (250, 60), (0, 255, 0), 2)
            cv2.putText(processed_frame, f'Person Count: {person_count}',
                       (20, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        # Line crossing detection
        line_crossings = self.camera_config.get('line_crossings', [])
        if line_crossings:
            # Check for line crossings
            crossing_events = self.line_crossing_detector.check_line_crossing(
                all_detections,
                line_crossings,
                frame.shape[:2]
            )

            # Handle crossing events
            for crossing_event in crossing_events:
                self._handle_line_crossing(frame, crossing_event, line_crossings)
                # Draw crossing event on frame
                processed_frame = self.line_crossing_detector.draw_crossing_event(
                    processed_frame,
                    crossing_event
                )

            # Draw line crossing zones
            processed_frame = self.line_crossing_detector.draw_line_crossings(
                processed_frame,
                line_crossings
            )

        # Apply heatmap overlay if enabled
        if self.heatmap_enabled:
            # Initialize heatmap generator on first frame
            if self.heatmap_generator is None:
                self.heatmap_generator = HeatmapGenerator(
                    frame_shape=frame.shape[:2],
                    decay_rate=0.98
                )
                logger.info(f"Heatmap generator initialized for camera {self.camera_id}")

            # Update heatmap with current detections
            self.heatmap_generator.update(all_detections)

            # Apply heatmap overlay to processed frame
            processed_frame = self.heatmap_generator.get_heatmap_overlay(
                processed_frame,
                alpha=0.5,
                colormap=cv2.COLORMAP_JET
            )

        return processed_frame

    def _handle_line_crossing(self, frame: np.ndarray, crossing_event: dict, line_crossings: List[dict]):
        """Handle line crossing event - save log and send alert"""
        from models import LineCrossingLog, LineCrossing

        # Get line crossing configuration
        line_id = crossing_event.get('line_id')
        line_config = next((lc for lc in line_crossings if lc['id'] == line_id), None)

        if not line_config:
            return

        # Save crossing image
        image_path = None
        if self.camera_config.get('save_images', True):
            # Create line_crossings directory if it doesn't exist
            from config import settings
            line_crossing_dir = os.path.join(settings.DETECTION_IMAGES_DIR, 'line_crossings')
            os.makedirs(line_crossing_dir, exist_ok=True)

            # Save image with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            filename = f"line_crossing_{self.camera_id}_{line_id}_{timestamp}.jpg"
            image_path = os.path.join(line_crossing_dir, filename)

            # Draw crossing event on frame before saving
            frame_with_crossing = self.line_crossing_detector.draw_crossing_event(
                frame.copy(),
                crossing_event
            )
            frame_with_crossing = self.line_crossing_detector.draw_line_crossings(
                frame_with_crossing,
                [line_config]
            )

            cv2.imwrite(image_path, frame_with_crossing)
            logger.info(f"Saved line crossing image: {image_path}")

        # Save to database
        try:
            crossing_log = LineCrossingLog(
                line_crossing_id=line_id,
                camera_id=self.camera_id,
                object_class=crossing_event.get('object_class', 'unknown'),
                track_id=crossing_event.get('track_id'),
                confidence=crossing_event.get('confidence', 0.0),
                direction=crossing_event.get('direction', 'unknown'),
                crossing_point=crossing_event.get('crossing_point'),
                image_path=image_path,
                timestamp=datetime.utcnow()
            )

            self.db_session.add(crossing_log)

            # Update crossing count
            db_line_crossing = self.db_session.query(LineCrossing).filter(
                LineCrossing.id == line_id
            ).first()

            if db_line_crossing:
                # Update count based on direction
                direction = crossing_event.get('direction', '')

                # Count "in" for: up_to_down, left_to_right, or generic "in"
                # Count "out" for: down_to_up, right_to_left, or generic "out"
                if direction in ['up_to_down', 'left_to_right', 'in']:
                    db_line_crossing.count_in += 1
                    logger.info(f"Line {line_id}: count_in incremented to {db_line_crossing.count_in}")
                elif direction in ['down_to_up', 'right_to_left', 'out']:
                    db_line_crossing.count_out += 1
                    logger.info(f"Line {line_id}: count_out incremented to {db_line_crossing.count_out}")

                db_line_crossing.updated_at = datetime.utcnow()

            self.db_session.commit()

            # Update the in-memory camera_config with new counts so they appear on video
            if db_line_crossing:
                for lc in self.camera_config.get('line_crossings', []):
                    if lc.get('id') == line_id:
                        lc['count_in'] = db_line_crossing.count_in
                        lc['count_out'] = db_line_crossing.count_out
                        logger.debug(f"Updated in-memory config: Line {line_id} In={lc['count_in']} Out={lc['count_out']}")
                        break

            logger.info(f"Saved line crossing log: {crossing_event['object_class']} crossed line {line_id} ({direction})")

            # Send email alert if enabled
            if line_config.get('alert_enabled', True) and self.camera_config.get('email_alerts_enabled', False):
                email_recipients = self.camera_config.get('email_recipients', [])
                if email_recipients:
                    camera_name = self.camera_config.get('name', f'Camera {self.camera_id}')
                    line_name = line_config.get('name', f'Line {line_id}')

                    email_service.send_line_crossing_alert(
                        email_recipients,
                        camera_name,
                        line_name,
                        crossing_event,
                        image_path
                    )

                    # Mark email as sent
                    crossing_log.email_sent = True
                    self.db_session.commit()

        except Exception as e:
            logger.error(f"Error saving line crossing log: {e}")
            self.db_session.rollback()

    def _handle_violation(self, frame: np.ndarray, violation: dict):
        """Handle detected violation"""
        # Check detection interval to avoid spam
        detection_key = f"{violation['object_class']}_{violation['roi_name']}"
        current_time = datetime.now()
        
        detection_interval = self.camera_config.get('detection_interval', 5)
        
        if detection_key in self.last_detection_time:
            time_diff = (current_time - self.last_detection_time[detection_key]).total_seconds()
            if time_diff < detection_interval:
                return
        
        self.last_detection_time[detection_key] = current_time
        
        # Save detection image
        image_path = None
        if self.camera_config.get('save_images', True):
            image_path = ai_service.save_detection_image(frame, violation, self.camera_id)
        
        # Save to database
        from models import Detection
        detection = Detection(
            camera_id=self.camera_id,
            violation_type=violation['violation_type'],
            object_class=violation['object_class'],
            confidence=violation['confidence'],
            bbox=violation['bbox'],
            roi_name=violation['roi_name'],
            image_path=image_path
        )
        self.db_session.add(detection)
        self.db_session.commit()
        
        # Send email alert if enabled
        if self.camera_config.get('email_alerts_enabled', False):
            email_recipients = self.camera_config.get('email_recipients', [])
            if email_recipients:
                email_service.send_alert_email(
                    recipients=email_recipients,
                    camera_name=self.camera_config['name'],
                    violation=violation,
                    image_path=image_path
                )

video_manager = VideoStreamManager()

