from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/rois", tags=["rois"])

@router.post("/", response_model=schemas.ROI)
def create_roi(roi: schemas.ROICreate, db: Session = Depends(get_db)):
    """Create a new ROI"""
    # Check if camera exists
    camera = db.query(models.Camera).filter(models.Camera.id == roi.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    db_roi = models.ROI(**roi.dict())
    db.add(db_roi)
    db.commit()
    db.refresh(db_roi)
    return db_roi

@router.get("/camera/{camera_id}", response_model=List[schemas.ROI])
def get_camera_rois(camera_id: int, db: Session = Depends(get_db)):
    """Get all ROIs for a camera"""
    rois = db.query(models.ROI).filter(models.ROI.camera_id == camera_id).all()
    return rois

@router.get("/{roi_id}", response_model=schemas.ROI)
def get_roi(roi_id: int, db: Session = Depends(get_db)):
    """Get ROI by ID"""
    roi = db.query(models.ROI).filter(models.ROI.id == roi_id).first()
    if not roi:
        raise HTTPException(status_code=404, detail="ROI not found")
    return roi

@router.put("/{roi_id}", response_model=schemas.ROI)
def update_roi(roi_id: int, roi_update: schemas.ROIUpdate, db: Session = Depends(get_db)):
    """Update ROI"""
    roi = db.query(models.ROI).filter(models.ROI.id == roi_id).first()
    if not roi:
        raise HTTPException(status_code=404, detail="ROI not found")
    
    update_data = roi_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(roi, field, value)
    
    db.commit()
    db.refresh(roi)
    return roi

@router.delete("/{roi_id}")
def delete_roi(roi_id: int, db: Session = Depends(get_db)):
    """Delete ROI"""
    roi = db.query(models.ROI).filter(models.ROI.id == roi_id).first()
    if not roi:
        raise HTTPException(status_code=404, detail="ROI not found")
    
    db.delete(roi)
    db.commit()
    return {"message": "ROI deleted successfully"}

