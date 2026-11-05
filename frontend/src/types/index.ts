export interface Detection {
  id?: string | number;
  class_name: string;
  confidence: number; // 0.0 - 1.0
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  track_id?: number;
  trail?: [number, number][]; // list of [cx, cy] history points
  speed_kmh?: number;
  color?: string;
  is_vehicle?: boolean;
  is_pedestrian?: boolean;
}

export interface DetectionSummary {
  total_objects: number;
  total_vehicles: number;
  total_pedestrians: number;
  total_traffic_elements: number;
  avg_confidence: number;
  classes_breakdown: Record<string, number>;
}

export interface ImageDetectionResponse {
  detections: Detection[];
  image_width: number;
  image_height: number;
  inference_time_ms: number;
  annotated_image_base64?: string;
  summary: DetectionSummary;
  model_name: string;
  source: 'fastapi' | 'tfjs-coco';
}

export interface VideoFrameDetection {
  frame_index: number;
  timestamp_sec: number;
  detections: Detection[];
}

export interface VideoTrackingResult {
  total_frames: number;
  fps: number;
  duration_sec: number;
  total_unique_tracks: number;
  total_vehicles: number;
  total_pedestrians: number;
  avg_confidence: number;
  frames: VideoFrameDetection[];
  processed_video_url?: string;
  inference_time_ms: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  media_type: 'image' | 'video' | 'live';
  filename: string;
  thumbnail: string;
  total_objects: number;
  total_vehicles: number;
  total_pedestrians: number;
  avg_confidence: number;
  inference_time_ms: number;
  model_used: string;
  detections: Detection[];
}

export interface AppSettings {
  confidence_threshold: number; // e.g. 0.35
  iou_threshold: number; // e.g. 0.45
  backend_url: string;
  engine_mode: 'auto' | 'fastapi' | 'tfjs';
  selected_model: string;
  show_labels: boolean;
  show_conf: boolean;
  show_trails: boolean;
  show_hud: boolean;
  enabled_classes: string[];
}

