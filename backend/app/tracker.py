import numpy as np
from typing import List, Dict, Tuple, Optional

TRACK_COLORS = [
    (255, 240, 0),   # Cyan (BGR: (255, 240, 0) or (0, 240, 255) in RGB)
    (20, 255, 57),   # Neon Lime
    (127, 0, 255),   # Neon Pink / Magenta
    (0, 230, 255),   # Electric Yellow
    (255, 0, 157),   # Purple Laser
    (0, 119, 255),   # Neon Orange
    (255, 229, 0),   # Bright Sky
    (136, 255, 0),   # Emerald Mint
    (102, 51, 255),  # Crimson
    (242, 55, 181),  # Violet
]

def calculate_iou(boxA: List[int], boxB: List[int]) -> float:
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    inter_w = max(0, xB - xA)
    inter_h = max(0, yB - yA)
    inter_area = inter_w * inter_h
    if inter_area == 0:
        return 0.0

    boxA_area = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxB_area = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    union_area = float(boxA_area + boxB_area - inter_area)
    return inter_area / union_area if union_area > 0 else 0.0

class TrackState:
    def __init__(self, track_id: int, class_name: str, bbox: List[int], confidence: float, is_vehicle: bool, is_pedestrian: bool):
        self.track_id = track_id
        self.class_name = class_name
        self.bbox = bbox
        self.confidence = confidence
        self.is_vehicle = is_vehicle
        self.is_pedestrian = is_pedestrian
        self.misses = 0
        self.age = 1
        cx = int((bbox[0] + bbox[2]) / 2)
        cy = int((bbox[1] + bbox[3]) / 2)
        self.trail: List[Tuple[int, int]] = [(cx, cy)]
        self.speed_kmh = 45 if is_vehicle else 5
        self.color_bgr = TRACK_COLORS[(track_id - 1) % len(TRACK_COLORS)]
        self.color_hex = f"#{self.color_bgr[2]:02x}{self.color_bgr[1]:02x}{self.color_bgr[0]:02x}"

    def update(self, bbox: List[int], confidence: float, max_trail: int = 30):
        prev_cx, prev_cy = self.trail[-1]
        cx = int((bbox[0] + bbox[2]) / 2)
        cy = int((bbox[1] + bbox[3]) / 2)
        
        # Calculate speed estimate from displacement
        dx = cx - prev_cx
        dy = cy - prev_cy
        disp = (dx**2 + dy**2) ** 0.5
        if self.is_vehicle:
            self.speed_kmh = max(18, min(125, int(disp * 2.2)))
        else:
            self.speed_kmh = max(3, min(15, int(disp * 0.5)))

        self.bbox = bbox
        self.confidence = confidence
        self.misses = 0
        self.age += 1
        self.trail.append((cx, cy))
        if len(self.trail) > max_trail:
            self.trail.pop(0)

class ByteTrackerPy:
    def __init__(self, max_age: int = 20, min_hits: int = 1, iou_thresh: float = 0.3):
        self.next_id = 1
        self.tracks: List[TrackState] = []
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_thresh = iou_thresh

    def reset(self):
        self.next_id = 1
        self.tracks = []

    def update(self, detections: List[Dict]) -> List[TrackState]:
        matched_tracks = set()
        matched_dets = set()

        matches = []
        for t_idx, track in enumerate(self.tracks):
            for d_idx, det in enumerate(detections):
                # Compatible class check
                compatible = (track.class_name == det['class_name']) or (track.is_vehicle and det['is_vehicle'])
                if not compatible:
                    continue
                iou = calculate_iou(track.bbox, det['bbox'])
                if iou >= self.iou_thresh:
                    matches.append((t_idx, d_idx, iou))

        matches.sort(key=lambda x: x[2], reverse=True)

        for t_idx, d_idx, _ in matches:
            if t_idx not in matched_tracks and d_idx not in matched_dets:
                matched_tracks.add(t_idx)
                matched_dets.add(d_idx)
                det = detections[d_idx]
                self.tracks[t_idx].update(det['bbox'], det['confidence'])

        # Increment misses for unmatched tracks
        for t_idx, track in enumerate(self.tracks):
            if t_idx not in matched_tracks:
                track.misses += 1

        # Create new tracks for unmatched detections
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_dets:
                track_id = self.next_id
                self.next_id += 1
                new_track = TrackState(
                    track_id=track_id,
                    class_name=det['class_name'],
                    bbox=det['bbox'],
                    confidence=det['confidence'],
                    is_vehicle=det['is_vehicle'],
                    is_pedestrian=det['is_pedestrian']
                )
                self.tracks.append(new_track)

        # Remove dead tracks
        self.tracks = [t for t in self.tracks if t.misses <= self.max_age]

        # Return currently active tracks
        return [t for t in self.tracks if t.misses == 0 and t.age >= self.min_hits]

