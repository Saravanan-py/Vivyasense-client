from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rtsp_url = Column(String, default="0")  # "0" for webcam, RTSP URL for IP camera
    username = Column(String)
    password = Column(String)
    streaming_channel = Column(String)
    location = Column(String)
    is_active = Column(Boolean, default=False)  # Camera is inactive by default
    confidence_threshold = Column(Float, default=0.31)
    custom_model = Column(String, default="general_detection")  # Changed from model_type
    allowed_classes = Column(JSON, default=list)  # List of class names to detect
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rois = relationship("ROI", back_populates="camera", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="camera", cascade="all, delete-orphan")
    settings = relationship("CameraSettings", back_populates="camera", uselist=False, cascade="all, delete-orphan")


class ROI(Base):
    __tablename__ = "rois"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    coordinates = Column(JSON, nullable=False)  # List of [x, y] points for polygon
    color = Column(String, default="#FF0000")
    is_active = Column(Boolean, default=True)
    alert_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    camera = relationship("Camera", back_populates="rois")


class Detection(Base):
    __tablename__ = "detections"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"))
    violation_type = Column(String, nullable=False)  # e.g., "Restricted Zone", "PPE Violation", "Fire"
    object_class = Column(String, nullable=False)  # e.g., "Person", "Fire", "Smoke"
    confidence = Column(Float, nullable=False)
    track_id = Column(Integer)
    bbox = Column(JSON)  # Bounding box coordinates [x1, y1, x2, y2]
    roi_name = Column(String)
    image_path = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    email_sent = Column(Boolean, default=False)
    
    # Relationships
    camera = relationship("Camera", back_populates="detections")


class LineCrossing(Base):
    """Line crossing zone configuration"""
    __tablename__ = "line_crossings"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    line_coordinates = Column(JSON, nullable=False)  # [[x1, y1], [x2, y2]] - start and end points
    color = Column(String, default="#00FF00")  # Green by default
    is_active = Column(Boolean, default=True)
    alert_enabled = Column(Boolean, default=True)

    # Direction tracking
    count_direction = Column(String, default="both")  # "both", "up", "down", "left", "right"

    # Counting settings
    count_in = Column(Integer, default=0)  # Count of objects crossing in one direction
    count_out = Column(Integer, default=0)  # Count of objects crossing in opposite direction

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    camera = relationship("Camera", backref="line_crossings")
    crossing_logs = relationship("LineCrossingLog", back_populates="line_crossing", cascade="all, delete-orphan")


class LineCrossingLog(Base):
    """Log of line crossing detections"""
    __tablename__ = "line_crossing_logs"

    id = Column(Integer, primary_key=True, index=True)
    line_crossing_id = Column(Integer, ForeignKey("line_crossings.id", ondelete="CASCADE"))
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"))

    # Detection details
    object_class = Column(String, nullable=False)  # e.g., "person", "car", "truck"
    track_id = Column(Integer)  # Tracking ID from object tracker
    confidence = Column(Float, nullable=False)

    # Crossing details
    direction = Column(String, nullable=False)  # "in", "out", "left_to_right", "right_to_left", etc.
    crossing_point = Column(JSON)  # [x, y] - point where object crossed the line

    # Image and timestamp
    image_path = Column(String)  # Path to saved detection image
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Email notification
    email_sent = Column(Boolean, default=False)

    # Relationships
    line_crossing = relationship("LineCrossing", back_populates="crossing_logs")
    camera = relationship("Camera", backref="line_crossing_logs")


class CameraSettings(Base):
    __tablename__ = "camera_settings"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), unique=True)
    email_alerts_enabled = Column(Boolean, default=False)
    email_recipients = Column(JSON, default=list)  # List of email addresses
    detection_interval = Column(Integer, default=5)  # Seconds between detections
    save_images = Column(Boolean, default=True)

    # People Counter Settings
    enable_people_counting = Column(Boolean, default=False)
    roi_enabled = Column(Boolean, default=False)

    # Fall Detection Settings
    enable_fall_detection = Column(Boolean, default=False)

    # Heatmap Settings
    heatmap_enabled = Column(Boolean, default=False)

    # Relationships
    camera = relationship("Camera", back_populates="settings")


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text)
    description = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProductivitySession(Base):
    """Productivity monitoring session reports"""
    __tablename__ = "productivity_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, nullable=False, index=True)

    # Session metadata
    rtsp_url = Column(String)
    model_name = Column(String)

    # Session timing
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    video_duration = Column(Float, default=0.0)  # Duration in seconds

    # Frame statistics
    total_frames = Column(Integer, default=0)
    fps = Column(Float, default=0.0)

    # ROI tracking data (stored as JSON)
    roi_stats = Column(JSON, default=list)  # List of ROI statistics

    # Recording paths
    video_recordings = Column(JSON, default=list)  # List of recording file paths

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

