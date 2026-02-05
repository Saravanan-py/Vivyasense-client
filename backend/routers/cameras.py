from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from video_service import video_manager

router = APIRouter(prefix="/api/cameras", tags=["cameras"])

@router.post("/", response_model=schemas.Camera)
def create_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db)):
    """Create a new camera"""
    db_camera = models.Camera(**camera.dict())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    
    # Create default settings
    settings = models.CameraSettings(camera_id=db_camera.id)
    db.add(settings)
    db.commit()
    
    return db_camera

@router.get("/", response_model=List[schemas.Camera])
def get_cameras(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all cameras ordered by ID"""
    cameras = db.query(models.Camera).order_by(models.Camera.id).offset(skip).limit(limit).all()
    return cameras

@router.get("/{camera_id}", response_model=schemas.Camera)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    """Get camera by ID"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.put("/{camera_id}", response_model=schemas.Camera)
def update_camera(camera_id: int, camera_update: schemas.CameraUpdate, db: Session = Depends(get_db)):
    """Update camera"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    update_data = camera_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(camera, field, value)
    
    db.commit()
    db.refresh(camera)
    
    # Update video stream if active
    if camera.is_active:
        camera_config = {
            'rtsp_url': camera.rtsp_url,
            'name': camera.name,
            'custom_model': camera.custom_model,
            'confidence_threshold': camera.confidence_threshold,
            'allowed_classes': camera.allowed_classes,
            'rois': [{'name': roi.name, 'coordinates': roi.coordinates,
                     'is_active': roi.is_active, 'alert_enabled': roi.alert_enabled}
                    for roi in camera.rois],
            'line_crossings': [{'id': lc.id, 'name': lc.name, 'line_coordinates': lc.line_coordinates,
                               'is_active': lc.is_active, 'alert_enabled': lc.alert_enabled,
                               'color': lc.color, 'count_direction': lc.count_direction,
                               'count_in': lc.count_in, 'count_out': lc.count_out}
                              for lc in camera.line_crossings],
            'email_alerts_enabled': camera.settings.email_alerts_enabled if camera.settings else False,
            'email_recipients': camera.settings.email_recipients if camera.settings else [],
            'detection_interval': camera.settings.detection_interval if camera.settings else 5,
            'save_images': camera.settings.save_images if camera.settings else True
        }
        video_manager.update_camera_config(camera_id, camera_config)
    
    return camera

@router.delete("/{camera_id}")
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    """Delete camera"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Stop video stream
    video_manager.stop_stream(camera_id)
    
    db.delete(camera)
    db.commit()
    return {"message": "Camera deleted successfully"}

@router.post("/{camera_id}/start")
def start_camera(camera_id: int, db: Session = Depends(get_db)):
    """Start camera stream"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    camera.is_active = True
    db.commit()
    
    # Start video stream
    camera_config = {
        'rtsp_url': camera.rtsp_url,
        'name': camera.name,
        'location': camera.location,
        'custom_model': camera.custom_model,
        'confidence_threshold': camera.confidence_threshold,
        'allowed_classes': camera.allowed_classes,
        'rois': [{'name': roi.name, 'coordinates': roi.coordinates,
                 'is_active': roi.is_active, 'alert_enabled': roi.alert_enabled, 'color': roi.color}
                for roi in camera.rois],
        'line_crossings': [{'id': lc.id, 'name': lc.name, 'line_coordinates': lc.line_coordinates,
                           'is_active': lc.is_active, 'alert_enabled': lc.alert_enabled,
                           'color': lc.color, 'count_direction': lc.count_direction,
                           'count_in': lc.count_in, 'count_out': lc.count_out}
                          for lc in camera.line_crossings],
        'email_alerts_enabled': camera.settings.email_alerts_enabled if camera.settings else False,
        'email_recipients': camera.settings.email_recipients if camera.settings else [],
        'detection_interval': camera.settings.detection_interval if camera.settings else 5,
        'save_images': camera.settings.save_images if camera.settings else True,
        'enable_people_counting': camera.settings.enable_people_counting if camera.settings else False,
        'roi_enabled': camera.settings.roi_enabled if camera.settings else False,
        'heatmap_enabled': camera.settings.heatmap_enabled if camera.settings else False
    }
    video_manager.start_stream(camera_id, camera_config, db)
    
    return {"message": "Camera started successfully"}

@router.post("/{camera_id}/stop")
def stop_camera(camera_id: int, db: Session = Depends(get_db)):
    """Stop camera stream"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    camera.is_active = False
    db.commit()
    
    # Stop video stream
    video_manager.stop_stream(camera_id)
    
    return {"message": "Camera stopped successfully"}

@router.get("/{camera_id}/settings", response_model=schemas.CameraSettings)
def get_camera_settings(camera_id: int, db: Session = Depends(get_db)):
    """Get camera settings"""
    settings = db.query(models.CameraSettings).filter(models.CameraSettings.camera_id == camera_id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings

@router.put("/{camera_id}/settings", response_model=schemas.CameraSettings)
def update_camera_settings(camera_id: int, settings_update: schemas.CameraSettingsUpdate,
                          db: Session = Depends(get_db)):
    """Update camera settings"""
    settings = db.query(models.CameraSettings).filter(models.CameraSettings.camera_id == camera_id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")

    update_data = settings_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)

    # If camera is active, update its configuration in real-time
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if camera and camera.is_active:
        camera_config = {
            'rtsp_url': camera.rtsp_url,
            'streaming_channel': camera.streaming_channel,
            'location': camera.location,
            'custom_model': camera.custom_model,
            'confidence_threshold': camera.confidence_threshold,
            'allowed_classes': camera.allowed_classes,
            'rois': [{'name': roi.name, 'coordinates': roi.coordinates,
                     'is_active': roi.is_active, 'alert_enabled': roi.alert_enabled, 'color': roi.color}
                    for roi in camera.rois],
            'email_alerts_enabled': settings.email_alerts_enabled,
            'email_recipients': settings.email_recipients,
            'detection_interval': settings.detection_interval,
            'save_images': settings.save_images,
            'enable_people_counting': settings.enable_people_counting,
            'roi_enabled': settings.roi_enabled,
            'heatmap_enabled': settings.heatmap_enabled
        }
        video_manager.update_camera_config(camera_id, camera_config)

    return settings

