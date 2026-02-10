"""
Line Crossing Detection Service
Detects when objects cross defined lines with direction tracking and counting
"""
import numpy as np
import cv2
from typing import List, Dict, Tuple, Optional, Any
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class LineCrossingDetector:
    """
    Detects line crossings with direction tracking and counting
    
    Features:
    - Bidirectional counting (in/out, left/right, up/down)
    - Object tracking integration
    - Direction filtering
    - Crossing point detection
    - Visual feedback
    """
    
    def __init__(self):
        # Track object positions for direction detection
        # Format: {track_id: [(x, y, timestamp), ...]}
        self.object_trajectories = defaultdict(list)

        # Track which objects have crossed which lines and their last direction
        # Format: {(track_id, line_id): {'last_direction': 'up_to_down', 'last_pos': (x, y), 'frames_since_cross': 0}}
        self.crossed_objects = {}

        # Maximum trajectory history length (increased for better tracking with frame drops)
        self.max_trajectory_length = 50

        # Minimum distance from line to reset crossing flag (allows re-crossing)
        self.reset_distance = 80  # pixels (increased for more reliable reset)

        # Minimum frames between counting same direction crossing (prevents double counting)
        self.min_frames_between_same_direction = 15  # ~0.5 seconds at 30fps
        
    def check_line_crossing(
        self,
        detections: List[Dict[str, Any]],
        line_crossings: List[Dict[str, Any]],
        frame_shape: Tuple[int, int]
    ) -> List[Dict[str, Any]]:
        """
        Check if any detected objects crossed any lines
        
        Args:
            detections: List of detected objects with bbox and track_id
            line_crossings: List of line crossing configurations
            frame_shape: (height, width) of the frame
            
        Returns:
            List of crossing events with details
        """
        crossing_events = []

        if not line_crossings:
            return crossing_events

        logger.debug(f"Checking line crossing: {len(detections)} detections, {len(line_crossings)} lines")

        # Update trajectories for all detected objects
        for detection in detections:
            track_id = detection.get('track_id')
            if track_id is None:
                # Skip detections without track_id (tracking not enabled for this model)
                continue
            
            # Get object center point
            bbox = detection.get('bbox', [])
            if len(bbox) != 4:
                continue
            
            x1, y1, x2, y2 = bbox
            center_x = int((x1 + x2) / 2)
            center_y = int((y1 + y2) / 2)
            
            # Add to trajectory
            self.object_trajectories[track_id].append((center_x, center_y))
            
            # Keep only recent positions
            if len(self.object_trajectories[track_id]) > self.max_trajectory_length:
                self.object_trajectories[track_id].pop(0)
            
            # Check crossing for each line
            for line_config in line_crossings:
                if not line_config.get('is_active', True):
                    continue

                line_id = line_config['id']
                line_coords = line_config['line_coordinates']

                if len(line_coords) != 2:
                    continue

                # Update frames since last crossing and check for reset
                crossing_key = (track_id, line_id)
                if crossing_key in self.crossed_objects:
                    # Increment frames counter
                    self.crossed_objects[crossing_key]['frames_since_cross'] += 1

                    # Check if object has moved far enough from line to reset crossing flag
                    distance = self._distance_to_line((center_x, center_y), line_coords)
                    if distance > self.reset_distance:
                        # Object has moved away from line, allow it to cross again
                        del self.crossed_objects[crossing_key]
                        logger.debug(f"Track {track_id} moved away from line {line_id} (distance={distance:.1f}px), reset crossing flag")

                # Check if object crossed this line
                crossing_info = self._detect_crossing(
                    track_id,
                    line_id,
                    line_coords,
                    detection
                )

                if crossing_info:
                    # Add line configuration details
                    crossing_info['line_id'] = line_id
                    crossing_info['line_name'] = line_config.get('name', f'Line {line_id}')
                    crossing_info['count_direction'] = line_config.get('count_direction', 'both')

                    # Filter by direction if specified
                    if self._should_count_crossing(crossing_info, line_config):
                        crossing_events.append(crossing_info)
                        logger.info(f"Line crossing detected: {crossing_info['object_class']} crossed {crossing_info['line_name']} ({crossing_info['direction']})")
        
        return crossing_events
    
    def _detect_crossing(
        self,
        track_id: int,
        line_id: int,
        line_coords: List[List[int]],
        detection: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Detect if an object crossed a line

        Args:
            track_id: Object tracking ID
            line_id: Line crossing ID
            line_coords: [[x1, y1], [x2, y2]] line coordinates
            detection: Detection information

        Returns:
            Crossing information dict or None
        """
        trajectory = self.object_trajectories.get(track_id, [])

        # Need at least 2 points to detect crossing
        if len(trajectory) < 2:
            return None

        # Get line endpoints
        (x1, y1), (x2, y2) = line_coords

        # Check last several trajectory segments (not just last 2 points)
        # This helps catch crossings even with frame drops
        max_segments_to_check = min(5, len(trajectory) - 1)

        crossed = False
        intersection_point = None
        crossing_direction = None

        # Check from most recent to older segments
        for i in range(max_segments_to_check):
            prev_pos = trajectory[-(i+2)]
            curr_pos = trajectory[-(i+1)]

            # Check if this segment crosses the line
            segment_crossed, segment_intersection = self._line_intersection(
                prev_pos, curr_pos, (x1, y1), (x2, y2)
            )

            if segment_crossed:
                crossed = True
                intersection_point = segment_intersection
                crossing_direction = self._get_crossing_direction(prev_pos, curr_pos, (x1, y1), (x2, y2))
                break  # Use the most recent crossing

        if not crossed:
            return None

        # Check if we should count this crossing
        crossing_key = (track_id, line_id)

        if crossing_key in self.crossed_objects:
            # Object has crossed before - check if it's crossing in the SAME direction
            last_direction = self.crossed_objects[crossing_key].get('last_direction')
            frames_since = self.crossed_objects[crossing_key].get('frames_since_cross', 0)

            if last_direction == crossing_direction:
                # Same direction crossing - only count if enough frames have passed
                if frames_since < self.min_frames_between_same_direction:
                    logger.debug(f"Track {track_id}: Ignoring same-direction crossing (only {frames_since} frames since last)")
                    return None
                else:
                    logger.info(f"Track {track_id}: Counting repeated {crossing_direction} crossing after {frames_since} frames")
            else:
                # Different direction - this is a valid back-and-forth crossing
                logger.info(f"Track {track_id}: Direction changed from {last_direction} to {crossing_direction}")

        # Mark as crossed and store direction and position
        self.crossed_objects[crossing_key] = {
            'last_direction': crossing_direction,
            'last_pos': trajectory[-1],
            'frames_since_cross': 0
        }

        # Create crossing event
        crossing_event = {
            'track_id': track_id,
            'object_class': detection.get('class', 'unknown'),
            'confidence': detection.get('confidence', 0.0),
            'direction': crossing_direction,
            'crossing_point': list(intersection_point) if intersection_point else list(trajectory[-1]),
            'bbox': detection.get('bbox', [])
        }

        return crossing_event

    def _distance_to_line(
        self,
        point: Tuple[int, int],
        line_coords: List[List[int]]
    ) -> float:
        """
        Calculate perpendicular distance from a point to a line

        Args:
            point: (x, y) point coordinates
            line_coords: [[x1, y1], [x2, y2]] line coordinates

        Returns:
            Distance in pixels
        """
        (x1, y1), (x2, y2) = line_coords
        px, py = point

        # Calculate line length
        line_length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)

        if line_length == 0:
            # Line is a point, return distance to that point
            return np.sqrt((px - x1)**2 + (py - y1)**2)

        # Calculate perpendicular distance using cross product
        distance = abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) / line_length

        return distance

    def _line_intersection(
        self,
        p1: Tuple[int, int],
        p2: Tuple[int, int],
        p3: Tuple[int, int],
        p4: Tuple[int, int]
    ) -> Tuple[bool, Optional[Tuple[float, float]]]:
        """
        Check if line segment p1-p2 intersects with line segment p3-p4

        Args:
            p1, p2: First line segment endpoints
            p3, p4: Second line segment endpoints

        Returns:
            (crossed, intersection_point) tuple
        """
        x1, y1 = p1
        x2, y2 = p2
        x3, y3 = p3
        x4, y4 = p4

        # Calculate denominators
        denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

        if abs(denom) < 1e-10:
            # Lines are parallel
            return False, None

        # Calculate intersection parameters
        t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
        u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

        # Check if intersection is within both line segments
        if 0 <= t <= 1 and 0 <= u <= 1:
            # Calculate intersection point
            intersection_x = x1 + t * (x2 - x1)
            intersection_y = y1 + t * (y2 - y1)
            return True, (intersection_x, intersection_y)

        return False, None

    def _get_crossing_direction(
        self,
        prev_pos: Tuple[int, int],
        curr_pos: Tuple[int, int],
        line_start: Tuple[int, int],
        line_end: Tuple[int, int]
    ) -> str:
        """
        Determine the direction of crossing

        Args:
            prev_pos: Previous object position
            curr_pos: Current object position
            line_start: Line start point
            line_end: Line end point

        Returns:
            Direction string: "in", "out", "left_to_right", "right_to_left", "up_to_down", "down_to_up"
        """
        # Calculate cross product to determine which side of the line the points are on
        def cross_product(p1, p2, p3):
            return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0])

        prev_cross = cross_product(line_start, line_end, prev_pos)
        curr_cross = cross_product(line_start, line_end, curr_pos)

        # Determine line orientation
        dx = line_end[0] - line_start[0]
        dy = line_end[1] - line_start[1]

        # Check if line is more horizontal or vertical
        if abs(dx) > abs(dy):
            # Horizontal line
            if prev_cross < 0 and curr_cross > 0:
                return "up_to_down"  # or "in"
            elif prev_cross > 0 and curr_cross < 0:
                return "down_to_up"  # or "out"
        else:
            # Vertical line
            if prev_cross < 0 and curr_cross > 0:
                return "left_to_right"  # or "in"
            elif prev_cross > 0 and curr_cross < 0:
                return "right_to_left"  # or "out"

        # Default to generic in/out
        if prev_cross < 0 and curr_cross > 0:
            return "in"
        else:
            return "out"

    def _should_count_crossing(
        self,
        crossing_info: Dict[str, Any],
        line_config: Dict[str, Any]
    ) -> bool:
        """
        Check if crossing should be counted based on direction filter

        Args:
            crossing_info: Crossing event information
            line_config: Line configuration with count_direction setting

        Returns:
            True if crossing should be counted
        """
        count_direction = line_config.get('count_direction', 'both')
        crossing_direction = crossing_info.get('direction', '')

        if count_direction == 'both':
            return True

        # Map crossing directions to count directions
        direction_mapping = {
            'up': ['up_to_down', 'in'],
            'down': ['down_to_up', 'out'],
            'left': ['left_to_right', 'in'],
            'right': ['right_to_left', 'out']
        }

        allowed_directions = direction_mapping.get(count_direction, [])
        return crossing_direction in allowed_directions

    def draw_line_crossings(
        self,
        frame: np.ndarray,
        line_crossings: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Draw line crossing zones on frame

        Args:
            frame: Video frame
            line_crossings: List of line crossing configurations

        Returns:
            Frame with lines drawn
        """
        for line_config in line_crossings:
            if not line_config.get('is_active', True):
                continue

            line_coords = line_config.get('line_coordinates', [])
            if len(line_coords) != 2:
                continue

            # Get line endpoints
            (x1, y1), (x2, y2) = line_coords

            # Get color (convert hex to BGR)
            color_hex = line_config.get('color', '#00FF00')
            color = self._hex_to_bgr(color_hex)

            # Draw line
            cv2.line(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 3)

            # Draw endpoints
            cv2.circle(frame, (int(x1), int(y1)), 6, color, -1)
            cv2.circle(frame, (int(x2), int(y2)), 6, color, -1)

            # Draw line name
            name = line_config.get('name', f"Line {line_config.get('id', '')}")
            count_in = line_config.get('count_in', 0)
            count_out = line_config.get('count_out', 0)

            # Position label near the line
            label_x = int((x1 + x2) / 2)
            label_y = int((y1 + y2) / 2) - 10

            label = f"{name}: In={count_in} Out={count_out}"

            # Draw background for text
            (text_width, text_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(
                frame,
                (label_x - 5, label_y - text_height - 5),
                (label_x + text_width + 5, label_y + 5),
                (0, 0, 0),
                -1
            )

            # Draw text
            cv2.putText(
                frame,
                label,
                (label_x, label_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2
            )

        return frame

    def draw_crossing_event(
        self,
        frame: np.ndarray,
        crossing_event: Dict[str, Any]
    ) -> np.ndarray:
        """
        Draw crossing event visualization on frame

        Args:
            frame: Video frame
            crossing_event: Crossing event information

        Returns:
            Frame with crossing event drawn
        """
        crossing_point = crossing_event.get('crossing_point', [])
        if len(crossing_point) != 2:
            return frame

        x, y = int(crossing_point[0]), int(crossing_point[1])

        # Draw crossing point
        cv2.circle(frame, (x, y), 10, (0, 255, 255), -1)  # Yellow circle
        cv2.circle(frame, (x, y), 15, (0, 255, 255), 2)   # Yellow outline

        # Draw direction arrow
        direction = crossing_event.get('direction', '')
        arrow_length = 30

        if 'up' in direction:
            end_point = (x, y - arrow_length)
        elif 'down' in direction:
            end_point = (x, y + arrow_length)
        elif 'left' in direction:
            end_point = (x - arrow_length, y)
        elif 'right' in direction:
            end_point = (x + arrow_length, y)
        else:
            end_point = (x, y - arrow_length)

        cv2.arrowedLine(frame, (x, y), end_point, (0, 255, 255), 3, tipLength=0.3)

        return frame

    def reset_crossed_objects(self, track_id: Optional[int] = None):
        """
        Reset crossing history for cleanup

        Args:
            track_id: If provided, reset only this track. Otherwise reset all.
        """
        if track_id is not None:
            # Remove all crossings for this track
            keys_to_remove = [key for key in self.crossed_objects.keys() if key[0] == track_id]
            for key in keys_to_remove:
                del self.crossed_objects[key]

            # Remove trajectory
            if track_id in self.object_trajectories:
                del self.object_trajectories[track_id]
        else:
            # Reset all
            self.crossed_objects.clear()
            self.object_trajectories.clear()

    def get_statistics(self, line_id: int) -> Dict[str, int]:
        """
        Get crossing statistics for a line

        Args:
            line_id: Line crossing ID

        Returns:
            Dictionary with crossing counts
        """
        # Count crossings for this line
        crossings = [key for key in self.crossed_objects.keys() if key[1] == line_id]

        return {
            'total_crossings': len(crossings),
            'unique_objects': len(set(key[0] for key in crossings))
        }

    def _hex_to_bgr(self, hex_color: str) -> Tuple[int, int, int]:
        """
        Convert hex color to BGR tuple

        Args:
            hex_color: Hex color string (e.g., "#FF0000")

        Returns:
            BGR tuple (b, g, r)
        """
        hex_color = hex_color.lstrip('#')
        r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        return (b, g, r)  # OpenCV uses BGR

