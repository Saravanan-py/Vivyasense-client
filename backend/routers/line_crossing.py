"""
Line Crossing API Endpoints
Manage line crossing zones and view crossing logs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import models
from database import get_db
from video_service import video_manager

router = APIRouter(prefix="/api/line-crossing", tags=["line-crossing"])


def _reload_camera_config(camera_id: int, db: Session):
    """Reload camera configuration in video manager"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if camera and camera.is_active:
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
        }
        video_manager.update_camera_config(camera_id, camera_config)


# Pydantic models for request/response
class LineCrossingCreate(BaseModel):
    name: str
    line_coordinates: List[List[int]]  # [[x1, y1], [x2, y2]]
    color: str = "#00FF00"
    is_active: bool = True
    alert_enabled: bool = True
    count_direction: str = "both"  # "both", "up", "down", "left", "right"


class LineCrossingUpdate(BaseModel):
    name: Optional[str] = None
    line_coordinates: Optional[List[List[int]]] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    alert_enabled: Optional[bool] = None
    count_direction: Optional[str] = None


class LineCrossingResponse(BaseModel):
    id: int
    camera_id: int
    name: str
    line_coordinates: List[List[int]]
    color: str
    is_active: bool
    alert_enabled: bool
    count_direction: str
    count_in: int
    count_out: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LineCrossingLogResponse(BaseModel):
    id: int
    line_crossing_id: int
    camera_id: int
    object_class: str
    track_id: Optional[int]
    confidence: float
    direction: str
    crossing_point: Optional[List[float]]
    image_path: Optional[str]
    timestamp: datetime
    email_sent: bool

    class Config:
        from_attributes = True


# API Endpoints

@router.post("/{camera_id}", response_model=LineCrossingResponse)
def create_line_crossing(
    camera_id: int,
    line_crossing: LineCrossingCreate,
    db: Session = Depends(get_db)
):
    """Create a new line crossing zone for a camera"""
    # Verify camera exists
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Validate line coordinates
    if len(line_crossing.line_coordinates) != 2:
        raise HTTPException(
            status_code=400,
            detail="Line coordinates must have exactly 2 points: [[x1, y1], [x2, y2]]"
        )
    
    for point in line_crossing.line_coordinates:
        if len(point) != 2:
            raise HTTPException(
                status_code=400,
                detail="Each point must have exactly 2 coordinates: [x, y]"
            )
    
    # Create line crossing
    db_line_crossing = models.LineCrossing(
        camera_id=camera_id,
        name=line_crossing.name,
        line_coordinates=line_crossing.line_coordinates,
        color=line_crossing.color,
        is_active=line_crossing.is_active,
        alert_enabled=line_crossing.alert_enabled,
        count_direction=line_crossing.count_direction
    )
    
    db.add(db_line_crossing)
    db.commit()
    db.refresh(db_line_crossing)

    # Reload camera config to include new line crossing
    _reload_camera_config(camera_id, db)

    return db_line_crossing


@router.get("/{camera_id}", response_model=List[LineCrossingResponse])
def get_line_crossings(camera_id: int, db: Session = Depends(get_db)):
    """Get all line crossing zones for a camera"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    line_crossings = db.query(models.LineCrossing).filter(
        models.LineCrossing.camera_id == camera_id
    ).all()
    
    return line_crossings


@router.get("/detail/{line_id}", response_model=LineCrossingResponse)
def get_line_crossing(line_id: int, db: Session = Depends(get_db)):
    """Get a specific line crossing zone"""
    line_crossing = db.query(models.LineCrossing).filter(
        models.LineCrossing.id == line_id
    ).first()
    
    if not line_crossing:
        raise HTTPException(status_code=404, detail="Line crossing not found")
    
    return line_crossing


@router.put("/{line_id}", response_model=LineCrossingResponse)
def update_line_crossing(
    line_id: int,
    line_crossing_update: LineCrossingUpdate,
    db: Session = Depends(get_db)
):
    """Update a line crossing zone"""
    db_line_crossing = db.query(models.LineCrossing).filter(
        models.LineCrossing.id == line_id
    ).first()
    
    if not db_line_crossing:
        raise HTTPException(status_code=404, detail="Line crossing not found")
    
    # Update fields
    update_data = line_crossing_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_line_crossing, field, value)

    db_line_crossing.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_line_crossing)

    # Reload camera config to reflect updates
    _reload_camera_config(db_line_crossing.camera_id, db)

    return db_line_crossing


@router.delete("/{line_id}")
def delete_line_crossing(line_id: int, db: Session = Depends(get_db)):
    """Delete a line crossing zone"""
    db_line_crossing = db.query(models.LineCrossing).filter(
        models.LineCrossing.id == line_id
    ).first()

    if not db_line_crossing:
        raise HTTPException(status_code=404, detail="Line crossing not found")

    camera_id = db_line_crossing.camera_id
    db.delete(db_line_crossing)
    db.commit()

    # Reload camera config to remove deleted line crossing
    _reload_camera_config(camera_id, db)

    return {"message": "Line crossing deleted successfully"}


@router.post("/{line_id}/reset-count")
def reset_line_crossing_count(line_id: int, db: Session = Depends(get_db)):
    """Reset the crossing count for a line"""
    db_line_crossing = db.query(models.LineCrossing).filter(
        models.LineCrossing.id == line_id
    ).first()

    if not db_line_crossing:
        raise HTTPException(status_code=404, detail="Line crossing not found")

    db_line_crossing.count_in = 0
    db_line_crossing.count_out = 0
    db_line_crossing.updated_at = datetime.utcnow()
    db.commit()

    # Reload camera config to reflect reset counts
    _reload_camera_config(db_line_crossing.camera_id, db)

    return {"message": "Count reset successfully", "count_in": 0, "count_out": 0}


@router.get("/logs/{camera_id}", response_model=List[LineCrossingLogResponse])
def get_crossing_logs(
    camera_id: int,
    line_id: Optional[int] = Query(None, description="Filter by specific line"),
    hours: int = Query(24, description="Get logs from last N hours"),
    limit: int = Query(100, description="Maximum number of logs to return"),
    db: Session = Depends(get_db)
):
    """Get crossing logs for a camera"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Build query
    query = db.query(models.LineCrossingLog).filter(
        models.LineCrossingLog.camera_id == camera_id
    )

    # Filter by line if specified
    if line_id is not None:
        query = query.filter(models.LineCrossingLog.line_crossing_id == line_id)

    # Filter by time
    time_threshold = datetime.utcnow() - timedelta(hours=hours)
    query = query.filter(models.LineCrossingLog.timestamp >= time_threshold)

    # Order by most recent first
    query = query.order_by(desc(models.LineCrossingLog.timestamp))

    # Limit results
    logs = query.limit(limit).all()

    return logs


@router.get("/statistics/{line_id}")
def get_line_crossing_statistics(
    line_id: int,
    hours: int = Query(24, description="Get statistics from last N hours"),
    db: Session = Depends(get_db)
):
    """Get statistics for a line crossing zone"""
    line_crossing = db.query(models.LineCrossing).filter(
        models.LineCrossing.id == line_id
    ).first()

    if not line_crossing:
        raise HTTPException(status_code=404, detail="Line crossing not found")

    # Get logs from specified time period
    time_threshold = datetime.utcnow() - timedelta(hours=hours)
    logs = db.query(models.LineCrossingLog).filter(
        models.LineCrossingLog.line_crossing_id == line_id,
        models.LineCrossingLog.timestamp >= time_threshold
    ).all()

    # Calculate statistics
    total_crossings = len(logs)
    unique_objects = len(set(log.track_id for log in logs if log.track_id is not None))

    # Count by direction
    direction_counts = {}
    for log in logs:
        direction = log.direction
        direction_counts[direction] = direction_counts.get(direction, 0) + 1

    # Count by object class
    class_counts = {}
    for log in logs:
        obj_class = log.object_class
        class_counts[obj_class] = class_counts.get(obj_class, 0) + 1

    return {
        "line_id": line_id,
        "line_name": line_crossing.name,
        "time_period_hours": hours,
        "total_crossings": total_crossings,
        "unique_objects": unique_objects,
        "count_in": line_crossing.count_in,
        "count_out": line_crossing.count_out,
        "direction_counts": direction_counts,
        "class_counts": class_counts,
        "recent_logs": logs[:10]  # Last 10 crossings
    }


@router.delete("/logs/{camera_id}")
def delete_crossing_logs(
    camera_id: int,
    hours: Optional[int] = Query(None, description="Delete logs older than N hours"),
    db: Session = Depends(get_db)
):
    """Delete crossing logs for a camera"""
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    query = db.query(models.LineCrossingLog).filter(
        models.LineCrossingLog.camera_id == camera_id
    )

    if hours is not None:
        time_threshold = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(models.LineCrossingLog.timestamp < time_threshold)

    deleted_count = query.delete()
    db.commit()

    return {"message": f"Deleted {deleted_count} crossing logs"}

