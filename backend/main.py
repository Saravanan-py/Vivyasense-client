from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from database import init_db
from routers import cameras, rois, detections, stream, line_crossing
from config import settings

print("\n" + "="*60)
print("🚀 VIVYASENSE AI VIDEO ANALYTICS")
print("="*60)
print("Using PyTorch for AI inference")
print("="*60 + "\n")

# Initialize database
init_db()

app = FastAPI(
    title="VivyaSense API",
    description="AI Video Analytics for Restricted Zone Monitoring",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
       "*"
    ],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Mount static files
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(cameras.router)
app.include_router(rois.router)
app.include_router(detections.router)
app.include_router(stream.router)
app.include_router(line_crossing.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to VivyaSense API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

