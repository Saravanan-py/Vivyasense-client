from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Camera Schemas
class CameraBase(BaseModel):
    name: str
    rtsp_url: Optional[str] = "0"  # "0" for webcam, RTSP URL for IP camera
    username: Optional[str] = None
    password: Optional[str] = None
    streaming_channel: Optional[str] = "1"
    location: Optional[str] = None
    confidence_threshold: float = 0.31
    custom_model: str = "general_detection"  # Changed from model_type
    allowed_classes: List[str] = []

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    rtsp_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    streaming_channel: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    confidence_threshold: Optional[float] = None
    custom_model: Optional[str] = None  # Changed from model_type
    allowed_classes: Optional[List[str]] = None

class Camera(CameraBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ROI Schemas
class ROIBase(BaseModel):
    name: str
    coordinates: List[List[float]]  # [[x1, y1], [x2, y2], ...]
    color: str = "#FF0000"
    alert_enabled: bool = True

class ROICreate(ROIBase):
    camera_id: int

class ROIUpdate(BaseModel):
    name: Optional[str] = None
    coordinates: Optional[List[List[float]]] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    alert_enabled: Optional[bool] = None

class ROI(ROIBase):
    id: int
    camera_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Detection Schemas
class DetectionBase(BaseModel):
    violation_type: str
    object_class: str
    confidence: float
    track_id: Optional[int] = None
    bbox: Optional[List[float]] = None
    roi_name: Optional[str] = None

class DetectionCreate(DetectionBase):
    camera_id: int
    image_path: Optional[str] = None

class Detection(DetectionBase):
    id: int
    camera_id: int
    camera_location: Optional[str] = None
    image_path: Optional[str] = None
    timestamp: datetime
    email_sent: bool

    class Config:
        from_attributes = True

# Camera Settings Schemas
class CameraSettingsBase(BaseModel):
    email_alerts_enabled: bool = False
    email_recipients: List[str] = []
    detection_interval: int = 5
    save_images: bool = True
    enable_people_counting: bool = False
    roi_enabled: bool = False
    heatmap_enabled: bool = False

class CameraSettingsCreate(CameraSettingsBase):
    camera_id: int

class CameraSettingsUpdate(BaseModel):
    email_alerts_enabled: Optional[bool] = None
    email_recipients: Optional[List[str]] = None
    detection_interval: Optional[int] = None
    save_images: Optional[bool] = None
    enable_people_counting: Optional[bool] = None
    roi_enabled: Optional[bool] = None
    heatmap_enabled: Optional[bool] = None

class CameraSettings(CameraSettingsBase):
    id: int
    camera_id: int

    class Config:
        from_attributes = True

# Analytics Schemas
class AnalyticsSummary(BaseModel):
    total_violations: int
    violations_today: int
    active_cameras: int
    total_cameras: int

class AlertTypeCount(BaseModel):
    violation_type: str
    count: int

class ZoneAlertCount(BaseModel):
    zone_name: str
    count: int

class RecentDetection(BaseModel):
    id: int
    camera_name: str
    violation_type: str
    confidence: float
    timestamp: datetime
    image_path: Optional[str] = None

