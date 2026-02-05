from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from database import get_db
import models
from video_service import video_manager
import cv2
import os

router = APIRouter(prefix="/api/stream", tags=["stream"])

def generate_frames(camera_id: int, raw: bool = False, low_latency: bool = False):
    """Generate video frames at 50+ FPS for ultra-smooth playback

    Args:
        camera_id: Camera ID
        raw: If True, returns raw video without AI annotations
        low_latency: If True, optimized for raw stream (maximum FPS)
    """
    import time
    last_frame_time = time.time()

    # Target 50+ FPS for smooth playback (was 25 FPS)
    target_fps = 60 if low_latency else 50  # 60 FPS for raw, 50 FPS for models
    min_frame_interval = 1.0 / target_fps

    while True:
        current_time = time.time()

        # Minimal frame rate limiting for 50+ FPS
        elapsed = current_time - last_frame_time
        if elapsed < min_frame_interval:
            time.sleep(min_frame_interval - elapsed)

        if raw:
            frame = video_manager.get_raw_frame(camera_id)
        else:
            frame = video_manager.get_frame(camera_id)

        if frame is None:
            time.sleep(0.001)  # 1ms delay (was 10ms) - faster retry
            continue

        # Fast JPEG encoding for 50+ FPS
        if low_latency:
            # Raw stream: Lower quality for maximum speed (50+ FPS)
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 75, cv2.IMWRITE_JPEG_OPTIMIZE, 0]
        else:
            # AI models: Balanced quality for 50 FPS
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85, cv2.IMWRITE_JPEG_OPTIMIZE, 0]

        ret, buffer = cv2.imencode('.jpg', frame, encode_params)
        if not ret:
            continue

        frame_bytes = buffer.tobytes()
        last_frame_time = time.time()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@router.get("/{camera_id}")
def stream_camera(camera_id: int, raw: bool = False, db: Session = Depends(get_db)):
    """Stream camera video (processed or raw)

    Args:
        camera_id: Camera ID
        raw: If True, returns raw video without AI annotations (for ROI drawing)
    """
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Check if camera is using raw_stream model for low latency mode
    low_latency = (camera.custom_model == 'raw_stream')

    return StreamingResponse(
        generate_frames(camera_id, raw=raw, low_latency=low_latency),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/snapshot/{camera_id}")
def get_snapshot(camera_id: int, db: Session = Depends(get_db)):
    """Get current snapshot from camera"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    frame = video_manager.get_frame(camera_id)
    if frame is None:
        raise HTTPException(status_code=503, detail="Camera stream not available")

    # Encode frame as JPEG
    ret, buffer = cv2.imencode('.jpg', frame)
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to encode frame")

    return StreamingResponse(
        iter([buffer.tobytes()]),
        media_type="image/jpeg"
    )

@router.get("/detection-image/{image_name}")
def get_detection_image(image_name: str):
    """Get detection image"""
    from config import settings
    import logging
    logger = logging.getLogger(__name__)

    # Handle both filename and full path
    if os.path.isabs(image_name):
        # If full path is provided, use it directly
        image_path = image_name
    else:
        # If just filename, join with detection images directory
        image_path = os.path.join(settings.DETECTION_IMAGES_DIR, image_name)

    logger.info(f"Requesting detection image: {image_name}")
    logger.info(f"Full path: {image_path}")
    logger.info(f"File exists: {os.path.exists(image_path)}")

    if not os.path.exists(image_path):
        logger.error(f"Image not found: {image_path}")
        raise HTTPException(status_code=404, detail=f"Image not found: {image_name}")

    return FileResponse(image_path)

@router.get("/debug/detection-images")
def debug_detection_images():
    """Debug endpoint to list all detection images"""
    from config import settings
    import logging
    logger = logging.getLogger(__name__)

    detection_dir = settings.DETECTION_IMAGES_DIR
    logger.info(f"Detection images directory: {detection_dir}")

    if not os.path.exists(detection_dir):
        return {
            "error": "Detection images directory does not exist",
            "path": detection_dir,
            "files": []
        }

    files = os.listdir(detection_dir)
    return {
        "directory": detection_dir,
        "exists": True,
        "file_count": len(files),
        "files": files[:20]  # First 20 files
    }

