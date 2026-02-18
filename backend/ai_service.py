import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import Point, Polygon
import os
from datetime import datetime
from config import settings
import torch
import warnings
import logging

logger = logging.getLogger(__name__)

# Fix for PyTorch 2.6+ serialization issue with YOLO models
# Suppress the weights_only warning
warnings.filterwarnings('ignore', category=FutureWarning, message='.*weights_only.*')

# Add safe globals for YOLO model loading
try:
    torch.serialization.add_safe_globals([
        'ultralytics.nn.tasks.DetectionModel',
        'ultralytics.engine.model.Model',
        'collections.OrderedDict',
        'torch._utils._rebuild_tensor_v2'
    ])
except Exception:
    pass  # Ignore if already added or not supported

class AIDetectionService:
    def __init__(self):
        self.models = {}

        # Check GPU availability and set device
        # Priority: CUDA (NVIDIA) > MPS (Apple Silicon) > CPU
        if torch.cuda.is_available():
            # NVIDIA GPU (Linux/Windows)
            self.device = 'cuda:0'
            print(f"✓ GPU detected: {torch.cuda.get_device_name(0)}")
            print(f"✓ CUDA version: {torch.version.cuda}")
            print(f"✓ Using NVIDIA GPU for inference")

            # Enable TF32 for faster inference on Ampere GPUs
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True

            # GPU performance optimizations for 60 FPS
            torch.backends.cudnn.benchmark = True  # Auto-tune for best performance
            torch.backends.cudnn.deterministic = False  # Faster, non-deterministic

            # Set CUDA stream for async operations
            self.cuda_stream = torch.cuda.Stream()
            print(f"✓ GPU optimizations enabled: TF32, cuDNN benchmark, CUDA streams")
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            # Apple Silicon GPU (Mac M1/M2/M3)
            self.device = 'mps'
            self.cuda_stream = None
            print(f"✓ Apple Silicon GPU detected")
            print(f"✓ Using MPS (Metal Performance Shaders) for inference")
            print(f"✓ Performance: ~5-8x faster than CPU on Mac")
        else:
            # CPU fallback
            self.device = 'cpu'
            self.cuda_stream = None
            print("⚠ No GPU detected, using CPU (slower)")

        # Model configurations with their paths and class names
        self.model_configs = {
            'general_detection': {
                'path': 'yolov8n.pt',
                'classes': ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
                           'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
                           'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
                           'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
                           'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
                           'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
                           'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
                           'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
                           'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
                           'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush']
            },
            'ppe_detection': {
                'path': 'models/ppe_detection.pt',
                'classes': ['person', 'ear', 'ear-mufs', 'face', 'face-guard', 'face-mask', 'foot', 'tool', 'glasses', 'gloves', 'helmet', 'hands', 'head', 'medical-suit', 'shoes', 'safety-suit', 'safety-vest']
            },
            'fire_detection': {
                'path': 'models/fire_jayu_epochs20.pt',
                'classes': ['fire', 'smoke']
            },
            'fall_detection': {
                'path': 'models/best_fall.pt',
                'classes': ['fall', 'no-fall']
            },
            'best_asian1.pt': {
                'path': 'models/best_steel_final.pt',
                'classes': ['steel']
            }
        }

    def load_model(self, custom_model: str = "general_detection") -> YOLO:
        """Load YOLO model based on custom model selection with memory management"""
        if custom_model not in self.models:
            # Clear CUDA cache before loading new model to prevent OOM
            if self.device == 'cuda:0':
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                logger.info("Cleared CUDA cache before loading model")

            config = self.model_configs.get(custom_model, self.model_configs['general_detection'])
            model_path = config['path']

            try:
                # For general detection, use default YOLOv8n
                if custom_model == 'general_detection':
                    if not os.path.exists(f"models/{model_path}"):
                        print(f"Downloading {model_path} model...")
                        # Download and load model
                        self.models[custom_model] = YOLO(model_path)
                        os.makedirs("models", exist_ok=True)
                        # Save for future use
                        self.models[custom_model].save(f"models/{model_path}")
                    else:
                        print(f"Loading model from models/{model_path}...")
                        self.models[custom_model] = YOLO(f"models/{model_path}")
                else:
                    # For custom models, check if file exists
                    if os.path.exists(model_path):
                        print(f"Loading custom model from {model_path}...")
                        self.models[custom_model] = YOLO(model_path)
                    else:
                        print(f"Warning: Custom model {model_path} not found. Using general detection model.")
                        # Fallback to general detection
                        return self.load_model('general_detection')

                print(f"✓ Model {custom_model} loaded successfully!")

                # Print GPU memory usage if CUDA
                if self.device == 'cuda:0':
                    allocated = torch.cuda.memory_allocated(0) / 1024**3
                    reserved = torch.cuda.memory_reserved(0) / 1024**3
                    print(f"  GPU Memory: {allocated:.2f}GB allocated, {reserved:.2f}GB reserved")

            except Exception as e:
                print(f"Error loading model {model_path}: {str(e)}")
                print(f"Attempting to re-download model...")

                # Try to re-download the model
                try:
                    if custom_model == 'general_detection':
                        # Remove corrupted file if exists
                        if os.path.exists(f"models/{model_path}"):
                            os.remove(f"models/{model_path}")
                        # Re-download
                        self.models[custom_model] = YOLO(model_path)
                        os.makedirs("models", exist_ok=True)
                        self.models[custom_model].save(f"models/{model_path}")
                        print(f"✓ Model re-downloaded successfully!")
                    else:
                        # For custom models, fallback to general detection
                        print(f"Falling back to general detection model...")
                        return self.load_model('general_detection')
                except Exception as e2:
                    print(f"Failed to load model: {str(e2)}")
                    raise Exception(f"Could not load model {custom_model}. Please check your installation.")

        return self.models[custom_model]

    def clear_unused_models(self, keep_model: str = None):
        """Clear unused models from memory to free up GPU/RAM"""
        models_to_remove = []

        for model_name in self.models.keys():
            if keep_model is None or model_name != keep_model:
                models_to_remove.append(model_name)

        for model_name in models_to_remove:
            del self.models[model_name]
            logger.info(f"Cleared model {model_name} from memory")

        # Clear CUDA cache
        if self.device == 'cuda:0':
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            allocated = torch.cuda.memory_allocated(0) / 1024**3
            reserved = torch.cuda.memory_reserved(0) / 1024**3
            logger.info(f"GPU Memory after cleanup: {allocated:.2f}GB allocated, {reserved:.2f}GB reserved")

    def get_class_names(self, custom_model: str) -> List[str]:
        """Get class names for a specific model"""
        config = self.model_configs.get(custom_model, self.model_configs['general_detection'])
        return config['classes']

    def detect_objects(self, frame: np.ndarray, custom_model: str = "general_detection",
                      confidence: float = 0.31, allowed_classes: List[str] = None, is_cpu_mode: bool = False) -> List[Dict[str, Any]]:
        """Detect objects in frame using GPU/CPU acceleration with optimizations"""

        # Standard YOLO detection
        model = self.load_model(custom_model)

        # Optimize image size based on model type and CPU mode
        # CPU mode: Use smaller image sizes for faster inference
        if is_cpu_mode:
            img_size = 320 if custom_model == 'ppe_detection' else 480  # Smaller for CPU
        else:
            # GPU mode: Use optimal sizes for maximum FPS
            img_size = 416 if custom_model == 'ppe_detection' else 640  # Standard for GPU

        # Run inference with GPU/CPU acceleration and optimizations
        # Note: MPS (Apple Silicon) doesn't support FP16, only CUDA does
        use_half = torch.cuda.is_available()  # Only use FP16 on NVIDIA GPUs

        # CPU mode: Reduce max detections for faster processing
        if is_cpu_mode:
            max_det = 30 if custom_model == 'ppe_detection' else 100  # Fewer detections on CPU
        else:
            max_det = 50 if custom_model == 'ppe_detection' else 300  # More detections on GPU

        # GPU mode optimization: Use predict() for raw speed, track() only when needed
        # predict() is faster than track() when tracking is not required
        if is_cpu_mode or custom_model in ['ppe_detection', 'general_detection']:
            # Use track() for object tracking (line crossing, people counting)
            results = model.track(
                frame,
                conf=confidence,
                verbose=False,
                device=self.device,
                half=use_half,  # Use FP16 for faster inference on NVIDIA GPU only
                imgsz=img_size,  # Optimized size based on CPU/GPU mode
                max_det=max_det,  # Optimized max detections based on CPU/GPU mode
                persist=True,  # Enable persistent tracking across frames
                tracker="bytetrack.yaml"  # Use ByteTrack for better performance
            )
        else:
            # For other models, use faster predict() without tracking
            results = model.predict(
                frame,
                conf=confidence,
                verbose=False,
                device=self.device,
                half=use_half,
                imgsz=img_size,
                max_det=max_det
            )

        class_names = self.get_class_names(custom_model)

        detections = []

        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                class_name = class_names[cls_id] if cls_id < len(class_names) else "unknown"

                # Filter by allowed classes
                if allowed_classes and class_name not in allowed_classes:
                    continue

                conf = float(box.conf[0])
                bbox = box.xyxy[0].cpu().numpy().tolist()

                # Get tracking ID if available (required for line crossing detection)
                track_id = None
                if box.id is not None:
                    track_id = int(box.id[0])

                detections.append({
                    'class': class_name,
                    'confidence': conf,
                    'bbox': bbox,  # [x1, y1, x2, y2]
                    'class_id': cls_id,
                    'track_id': track_id  # Add tracking ID for line crossing detection
                })

                if track_id is not None:
                    print(f"✓ Detection with track_id={track_id}: {class_name} (conf={conf:.2f})")

        return detections

    def detect_objects_with_tracking(self, frame: np.ndarray, custom_model: str = "general_detection",
                                     confidence: float = 0.31, allowed_classes: List[str] = None) -> List[Dict[str, Any]]:
        """
        Detect objects with TRACKING enabled - always uses track() for persistent IDs
        This is specifically for steel counting and directional detection
        """
        model = self.load_model(custom_model)

        # Use optimal image size for steel detection
        img_size = 640
        use_half = torch.cuda.is_available()
        max_det = 300

        # ALWAYS use track() to get persistent track_id for each detection
        results = model.track(
            frame,
            conf=confidence,
            verbose=False,
            device=self.device,
            half=use_half,
            imgsz=img_size,
            max_det=max_det,
            persist=True,  # CRITICAL: Enable persistent tracking across frames
            tracker="bytetrack.yaml"  # Use ByteTrack for better performance
        )

        class_names = self.get_class_names(custom_model)
        detections = []

        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                class_name = class_names[cls_id] if cls_id < len(class_names) else "unknown"

                # Filter by allowed classes
                if allowed_classes and class_name not in allowed_classes:
                    continue

                conf = float(box.conf[0])
                bbox = box.xyxy[0].cpu().numpy().tolist()

                # Get tracking ID (should always be available with track())
                track_id = None
                if box.id is not None:
                    track_id = int(box.id[0])

                detections.append({
                    'class': class_name,
                    'confidence': conf,
                    'bbox': bbox,  # [x1, y1, x2, y2]
                    'class_id': cls_id,
                    'track_id': track_id  # Persistent tracking ID
                })

        return detections

    def is_point_in_roi(self, point: Tuple[float, float], roi_coords: List[List[float]]) -> bool:
        """Check if point is inside ROI polygon"""
        try:
            polygon = Polygon(roi_coords)
            point_obj = Point(point)
            return polygon.contains(point_obj)
        except:
            return False
    
    def check_roi_violation(self, bbox: List[float], roi_coords: List[List[float]]) -> bool:
        """Check if bounding box center is inside ROI"""
        x1, y1, x2, y2 = bbox
        center_x = (x1 + x2) / 2
        center_y = (y1 + y2) / 2
        return self.is_point_in_roi((center_x, center_y), roi_coords)
    
    def draw_detections(self, frame: np.ndarray, detections: List[Dict[str, Any]],
                       rois: List[Dict[str, Any]] = None, violations: List[Dict[str, Any]] = None) -> np.ndarray:
        """Draw detections and ROIs on frame"""
        output_frame = frame.copy()

        # Draw ROIs
        if rois:
            for roi in rois:
                if roi.get('is_active', True):
                    coords = np.array(roi['coordinates'], dtype=np.int32)
                    color = self._hex_to_bgr(roi.get('color', '#FF0000'))

                    # Draw filled polygon with transparency
                    overlay = output_frame.copy()
                    cv2.fillPoly(overlay, [coords], color)
                    cv2.addWeighted(overlay, 0.2, output_frame, 0.8, 0, output_frame)

                    # Draw border
                    cv2.polylines(output_frame, [coords], True, color, 3)

                    # ROI name label removed - will be displayed at top of frame instead

        # Draw detections
        for detection in detections:
            bbox = detection['bbox']
            x1, y1, x2, y2 = map(int, bbox)

            # Check if this is a violation
            is_violation = False
            if violations:
                for v in violations:
                    if v.get('bbox') == detection['bbox']:
                        is_violation = True
                        break

            # Color coding based on detection type
            class_name = detection['class'].lower()

            # Custom colors for fire, smoke, and fall detection
            if class_name == 'fire':
                # Orange-Red for fire
                color = (0, 69, 255)  # BGR: Orange-Red
                thickness = 3
                label = f"fire: {detection['confidence']:.2f}"
            elif class_name == 'smoke':
                # Gray for smoke
                color = (128, 128, 128)  # BGR: Gray
                thickness = 3
                label = f"smoke: {detection['confidence']:.2f}"
            elif class_name == 'fall':
                # Purple for fall detection
                color = (128, 0, 128)  # BGR: Purple
                thickness = 3
                label = f"fall: {detection['confidence']:.2f}"
            elif class_name == 'no-fall':
                # Blue for no-fall (normal standing/sitting)
                color = (255, 128, 0)  # BGR: Blue
                thickness = 2
                label = f"no-fall: {detection['confidence']:.2f}"
            elif is_violation:
                # Red for ROI violations - show only class name and confidence
                color = (0, 0, 255)
                thickness = 3
                label = f"{detection['class']}: {detection['confidence']:.2f}"
            else:
                # Green for normal detections
                color = (0, 255, 0)
                thickness = 2
                label = f"{detection['class']}: {detection['confidence']:.2f}"

            # Draw bounding box
            cv2.rectangle(output_frame, (x1, y1), (x2, y2), color, thickness)

            # Add label with background
            (text_width, text_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(output_frame, (x1, y1 - text_height - 10), (x1 + text_width, y1), color, -1)
            cv2.putText(output_frame, label, (x1, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        return output_frame
    
    def _hex_to_bgr(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to BGR"""
        hex_color = hex_color.lstrip('#')
        rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        return (rgb[2], rgb[1], rgb[0])  # Convert RGB to BGR
    
    def save_detection_image(self, frame: np.ndarray, detection: Dict[str, Any],
                            camera_id: int) -> str:
        """Save detection image"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"camera_{camera_id}_{timestamp}.jpg"
        filepath = os.path.join(settings.DETECTION_IMAGES_DIR, filename)

        # Crop detection area with padding
        bbox = detection['bbox']
        x1, y1, x2, y2 = map(int, bbox)
        h, w = frame.shape[:2]

        # Add 20% padding
        padding = 0.2
        pad_w = int((x2 - x1) * padding)
        pad_h = int((y2 - y1) * padding)

        x1 = max(0, x1 - pad_w)
        y1 = max(0, y1 - pad_h)
        x2 = min(w, x2 + pad_w)
        y2 = min(h, y2 + pad_h)

        cropped = frame[y1:y2, x1:x2]
        cv2.imwrite(filepath, cropped)

        return filename  # Return just filename, not full path

ai_service = AIDetectionService()

