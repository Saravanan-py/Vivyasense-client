from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/detections", tags=["detections"])

@router.get("/", response_model=List[schemas.Detection])
def get_detections(
    skip: int = 0,
    limit: int = 100,
    camera_id: Optional[int] = None,
    violation_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get detections with filters"""
    import os

    query = db.query(models.Detection).join(models.Camera)

    if camera_id:
        query = query.filter(models.Detection.camera_id == camera_id)
    if violation_type:
        query = query.filter(models.Detection.violation_type == violation_type)
    if start_date:
        query = query.filter(models.Detection.timestamp >= start_date)
    if end_date:
        query = query.filter(models.Detection.timestamp <= end_date)

    detections = query.order_by(desc(models.Detection.timestamp)).offset(skip).limit(limit).all()

    # Fix image paths and add camera location
    for detection in detections:
        if detection.image_path:
            # Extract just the filename from any path format
            detection.image_path = os.path.basename(detection.image_path)
        # Add camera location from relationship
        detection.camera_location = detection.camera.location if detection.camera else None

    return detections

@router.get("/{detection_id}", response_model=schemas.Detection)
def get_detection(detection_id: int, db: Session = Depends(get_db)):
    """Get detection by ID"""
    detection = db.query(models.Detection).filter(models.Detection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    return detection

@router.delete("/{detection_id}")
def delete_detection(detection_id: int, db: Session = Depends(get_db)):
    """Delete detection"""
    detection = db.query(models.Detection).filter(models.Detection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    db.delete(detection)
    db.commit()
    return {"message": "Detection deleted successfully"}

@router.get("/analytics/summary", response_model=schemas.AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Get analytics summary"""
    total_violations = db.query(models.Detection).count()

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    violations_today = db.query(models.Detection).filter(
        models.Detection.timestamp >= today
    ).count()

    total_cameras = db.query(models.Camera).count()
    active_cameras = db.query(models.Camera).filter(models.Camera.is_active == True).count()

    return {
        "total_violations": total_violations,
        "violations_today": violations_today,
        "active_cameras": active_cameras,
        "total_cameras": total_cameras
    }

@router.get("/analytics/alert-types", response_model=List[schemas.AlertTypeCount])
def get_alert_types(days: int = 7, db: Session = Depends(get_db)):
    """Get alert type counts"""
    start_date = datetime.now() - timedelta(days=days)
    
    results = db.query(
        models.Detection.violation_type,
        func.count(models.Detection.id).label('count')
    ).filter(
        models.Detection.timestamp >= start_date
    ).group_by(
        models.Detection.violation_type
    ).all()
    
    return [{"violation_type": r[0], "count": r[1]} for r in results]

@router.get("/analytics/zone-alerts", response_model=List[schemas.ZoneAlertCount])
def get_zone_alerts(days: int = 7, db: Session = Depends(get_db)):
    """Get zone alert counts"""
    start_date = datetime.now() - timedelta(days=days)
    
    results = db.query(
        models.Detection.roi_name,
        func.count(models.Detection.id).label('count')
    ).filter(
        models.Detection.timestamp >= start_date,
        models.Detection.roi_name.isnot(None)
    ).group_by(
        models.Detection.roi_name
    ).order_by(
        desc('count')
    ).limit(10).all()
    
    return [{"zone_name": r[0], "count": r[1]} for r in results]

@router.get("/analytics/recent", response_model=List[schemas.RecentDetection])
def get_recent_detections(limit: int = 10, db: Session = Depends(get_db)):
    """Get recent detections"""
    import logging
    import os
    logger = logging.getLogger(__name__)

    detections = db.query(models.Detection).join(
        models.Camera
    ).order_by(
        desc(models.Detection.timestamp)
    ).limit(limit).all()

    result = []
    for d in detections:
        # Extract just the filename from image_path (handles both absolute and relative paths)
        image_path = d.image_path
        if image_path:
            image_path = os.path.basename(image_path)

        logger.info(f"Detection {d.id}: original={d.image_path}, processed={image_path}")

        result.append({
            "id": d.id,
            "camera_name": d.camera.name,
            "violation_type": d.violation_type,
            "confidence": d.confidence,
            "timestamp": d.timestamp,
            "image_path": image_path
        })

    return result

