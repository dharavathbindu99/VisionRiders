from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class DetectionItem(BaseModel):
    id: Optional[str] = None
    class_name: str
    confidence: float
    bbox: List[int]  # [x1, y1, x2, y2]
    track_id: Optional[int] = None
    trail: Optional[List[List[int]]] = None
    speed_kmh: Optional[int] = None
    color: Optional[str] = None
    is_vehicle: bool = False
    is_pedestrian: bool = False

class DetectionSummary(BaseModel):
    total_objects: int
    total_vehicles: int
    total_pedestrians: int
    total_traffic_elements: int
    avg_confidence: float
    classes_breakdown: Dict[str, int]

class ImageDetectionResponse(BaseModel):
    detections: List[DetectionItem]
    image_width: int
    image_height: int
    inference_time_ms: float
    annotated_image_base64: Optional[str] = None
    summary: DetectionSummary
    model_name: str
    source: str = "fastapi"

class HealthResponse(BaseModel):
    status: str
    model_loaded: str
    device: str
    cuda_available: bool
    total_classes: int
    supported_classes: List[str]

