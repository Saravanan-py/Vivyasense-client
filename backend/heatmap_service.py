"""
Heatmap Generation Service
Generates activity heatmaps for camera feeds to visualize motion patterns and hotspots
"""
import numpy as np
import cv2
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class HeatmapGenerator:
    """
    Generates activity heatmaps based on object detections
    
    Features:
    - Motion/activity tracking
    - Temporal decay (older activity fades)
    - Gaussian blob visualization
    - Multiple colormap options
    - Configurable overlay transparency
    """
    
    def __init__(self, frame_shape: Tuple[int, int], decay_rate: float = 0.98):
        """
        Initialize heatmap generator
        
        Args:
            frame_shape: (height, width) of the video frame
            decay_rate: Rate at which heatmap fades (0.0-1.0, higher = slower fade)
        """
        self.height, self.width = frame_shape[:2]
        self.heatmap = np.zeros((self.height, self.width), dtype=np.float32)
        self.decay_rate = decay_rate
        self.frame_count = 0
        
        logger.info(f"HeatmapGenerator initialized: {self.width}x{self.height}, decay={decay_rate}")
    
    def update(self, detections: List[Dict[str, Any]]):
        """
        Update heatmap with new detections
        
        Args:
            detections: List of detected objects with bbox coordinates
        """
        # Apply temporal decay to existing heatmap
        self.heatmap *= self.decay_rate
        
        # Add new detections
        for detection in detections:
            bbox = detection.get('bbox', [])
            if len(bbox) != 4:
                continue
            
            x1, y1, x2, y2 = map(int, bbox)
            
            # Calculate center point
            center_x = (x1 + x2) // 2
            center_y = (y1 + y2) // 2
            
            # Ensure coordinates are within bounds
            center_x = max(0, min(center_x, self.width - 1))
            center_y = max(0, min(center_y, self.height - 1))
            
            # Calculate blob radius based on detection size
            bbox_width = x2 - x1
            bbox_height = y2 - y1
            radius = int(max(bbox_width, bbox_height) * 0.6)
            radius = max(20, min(radius, 100))  # Clamp between 20-100 pixels
            
            # Add Gaussian blob at detection center
            # Create a temporary mask for the Gaussian blob
            y_grid, x_grid = np.ogrid[-center_y:self.height-center_y, -center_x:self.width-center_x]
            mask = x_grid*x_grid + y_grid*y_grid <= radius*radius
            
            # Add weighted contribution (closer to center = higher value)
            distance = np.sqrt(x_grid*x_grid + y_grid*y_grid)
            gaussian = np.exp(-(distance**2) / (2 * (radius/2)**2))
            
            # Add to heatmap with clipping to prevent overflow
            self.heatmap = np.clip(self.heatmap + gaussian * mask * 0.5, 0, 10.0)
        
        self.frame_count += 1
    
    def get_heatmap_overlay(
        self, 
        frame: np.ndarray, 
        alpha: float = 0.5,
        colormap: int = cv2.COLORMAP_JET
    ) -> np.ndarray:
        """
        Generate heatmap overlay on frame
        
        Args:
            frame: Original video frame
            alpha: Transparency of heatmap overlay (0.0-1.0)
            colormap: OpenCV colormap (COLORMAP_JET, COLORMAP_HOT, etc.)
        
        Returns:
            Frame with heatmap overlay
        """
        # Normalize heatmap to 0-255 range
        if self.heatmap.max() > 0:
            normalized = cv2.normalize(self.heatmap, None, 0, 255, cv2.NORM_MINMAX)
        else:
            normalized = np.zeros_like(self.heatmap)
        
        heatmap_uint8 = normalized.astype(np.uint8)
        
        # Apply colormap (JET: blue->green->yellow->red)
        colored_heatmap = cv2.applyColorMap(heatmap_uint8, colormap)
        
        # Resize heatmap to match frame size if needed
        if colored_heatmap.shape[:2] != frame.shape[:2]:
            colored_heatmap = cv2.resize(colored_heatmap, (frame.shape[1], frame.shape[0]))
        
        # Create mask for non-zero heatmap areas (to avoid darkening entire frame)
        mask = heatmap_uint8 > 10  # Only show heatmap where there's significant activity
        
        # Blend with original frame
        output = frame.copy()
        output[mask] = cv2.addWeighted(
            frame[mask], 
            1 - alpha, 
            colored_heatmap[mask], 
            alpha, 
            0
        )
        
        # Add heatmap legend/indicator
        self._draw_heatmap_indicator(output)
        
        return output
    
    def _draw_heatmap_indicator(self, frame: np.ndarray):
        """Draw a small indicator showing heatmap is active"""
        # Draw "HEATMAP" label in top-right corner
        text = "HEATMAP MODE"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.6
        thickness = 2
        
        (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)
        
        # Position in top-right corner
        x = frame.shape[1] - text_width - 15
        y = 30
        
        # Draw background
        cv2.rectangle(frame, (x - 5, y - text_height - 5), (x + text_width + 5, y + 5), (0, 0, 0), -1)
        cv2.rectangle(frame, (x - 5, y - text_height - 5), (x + text_width + 5, y + 5), (0, 165, 255), 2)
        
        # Draw text
        cv2.putText(frame, text, (x, y), font, font_scale, (0, 165, 255), thickness)
    
    def reset(self):
        """Reset heatmap to zero"""
        self.heatmap = np.zeros((self.height, self.width), dtype=np.float32)
        self.frame_count = 0
        logger.info("Heatmap reset")
    
    def get_heatmap_stats(self) -> Dict[str, Any]:
        """Get statistics about current heatmap"""
        return {
            'max_intensity': float(self.heatmap.max()),
            'mean_intensity': float(self.heatmap.mean()),
            'frame_count': self.frame_count,
            'active_pixels': int(np.sum(self.heatmap > 0.1))
        }

