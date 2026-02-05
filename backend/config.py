from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://vivyasense:vivyasense123@localhost:5432/vivyasense_db"
    
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "vivyasense-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AI Models
    MODEL_PATH: str = "models/yolo26n.pt"
    CONFIDENCE_THRESHOLD: float = 0.31
    IOU_THRESHOLD: float = 0.45
    
    # Storage
    UPLOAD_DIR: str = "uploads"
    DETECTION_IMAGES_DIR: str = "uploads/detections"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Get the backend directory (where this config.py file is located)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Make paths absolute
settings.UPLOAD_DIR = os.path.join(BACKEND_DIR, settings.UPLOAD_DIR)
settings.DETECTION_IMAGES_DIR = os.path.join(BACKEND_DIR, settings.DETECTION_IMAGES_DIR)

# Create necessary directories
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.DETECTION_IMAGES_DIR, exist_ok=True)
os.makedirs(os.path.join(BACKEND_DIR, "models"), exist_ok=True)

