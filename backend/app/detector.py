import os
import time
import base64
import cv2
import numpy as np
import torch
from typing import List, Dict, Tuple, Optional
from ultralytics import YOLO

VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle", "bicycle", "train"}
PEDESTRIAN_CLASSES = {"person"}
TRAFFIC_CLASSES = {"traffic light", "stop sign", "fire hydrant", "parking meter"}

class YOLODetector:
    def __init__(self, model_path: str = "backend/models/yolov8n.pt"):
        self.model_path = model_path
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self._load_model()

    def _load_model(self):
        # Resolve absolute path if relative
        abs_path = os.path.abspath(self.model_path)
        if not os.path.exists(abs_path):
            # Check current directory
            if os.path.exists("models/yolov8n.pt"):
                abs_path = os.path.abspath("models/yolov8n.pt")
            elif os.path.exists("yolov8n.pt"):
                abs_path = os.path.abspath("yolov8n.pt")

        print(f"[VisionRiders] Loading YOLO model from: {abs_path} on {self.device}")
        self.model = YOLO(abs_path)
        # Warmup model with a dummy tensor
        dummy = np.zeros((320, 320, 3), dtype=np.uint8)
        self.model(dummy, verbose=False)
        print(f"[VisionRiders] YOLO model ready with {len(self.model.names)} classes.")

    def get_supported_classes(self) -> List[str]:
        if self.model and hasattr(self.model, "names"):
            return list(self.model.names.values())
        return []

    def detect_image_cv(self, img_bgr: np.ndarray, conf_threshold: float = 0.35, iou_threshold: float = 0.45) -> Tuple[List[Dict], float]:
        start_time = time.time()
        results = self.model.predict(
            source=img_bgr,
            conf=conf_threshold,
            iou=iou_threshold,
            verbose=False,
            device=self.device
        )
        inference_time_ms = (time.time() - start_time) * 1000

        detections = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for idx in range(len(boxes)):
                xyxy = boxes.xyxy[idx].cpu().numpy().astype(int)
                conf = float(boxes.conf[idx].cpu().numpy())
                cls_id = int(boxes.cls[idx].cpu().numpy())
                cls_name = self.model.names.get(cls_id, f"cls_{cls_id}").lower()

                x1, y1, x2, y2 = xyxy.tolist()
                is_veh = cls_name in VEHICLE_CLASSES
                is_ped = cls_name in PEDESTRIAN_CLASSES

                detections.append({
                    "id": f"det_{idx}",
                    "class_name": cls_name,
                    "confidence": round(conf * 100, 1),
                    "bbox": [x1, y1, x2, y2],
                    "is_vehicle": is_veh,
                    "is_pedestrian": is_ped
                })

        return detections, round(inference_time_ms, 1)

    def draw_annotations(self, img_bgr: np.ndarray, detections: List[Dict], is_video: bool = False, show_hud: bool = True) -> np.ndarray:
        canvas = img_bgr.copy()
        h, w = canvas.shape[:2]

        # Draw Autonomous Driving HUD Guidelines
        if show_hud:
            cy = int(h * 0.62)
            cv2.line(canvas, (int(w * 0.1), cy), (int(w * 0.9), cy), (212, 182, 6), 1, cv2.LINE_AA)
            cv2.line(canvas, (int(w * 0.25), h), (int(w * 0.44), cy), (212, 182, 6), 1, cv2.LINE_AA)
            cv2.line(canvas, (int(w * 0.75), h), (int(w * 0.56), cy), (212, 182, 6), 1, cv2.LINE_AA)

        # Draw detections
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            box_w = x2 - x1
            box_h = y2 - y1

            # Determine color (BGR)
            if "color_bgr" in det:
                color = det["color_bgr"]
            elif det.get("is_vehicle"):
                color = (255, 240, 0) # Cyan
            elif det.get("is_pedestrian"):
                color = (20, 255, 57)  # Lime
            elif "light" in det["class_name"] or "sign" in det["class_name"]:
                color = (0, 184, 255)  # Amber
            else:
                color = (247, 85, 168) # Purple

            # Draw trails if available
            if "trail" in det and len(det["trail"]) > 1:
                trail = det["trail"]
                for i in range(1, len(trail)):
                    cv2.line(canvas, trail[i-1], trail[i], color, 2, cv2.LINE_AA)

            # Main bounding box
            cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

            # Draw futuristic corner brackets
            bracket = max(8, min(16, box_w // 4, box_h // 4))
            white = (255, 255, 255)
            # Top-left
            cv2.line(canvas, (x1, y1), (x1 + bracket, y1), white, 3)
            cv2.line(canvas, (x1, y1), (x1, y1 + bracket), white, 3)
            # Top-right
            cv2.line(canvas, (x2, y1), (x2 - bracket, y1), white, 3)
            cv2.line(canvas, (x2, y1), (x2, y1 + bracket), white, 3)
            # Bottom-left
            cv2.line(canvas, (x1, y2), (x1 + bracket, y2), white, 3)
            cv2.line(canvas, (x1, y2), (x1, y2 - bracket), white, 3)
            # Bottom-right
            cv2.line(canvas, (x2, y2), (x2 - bracket, y2), white, 3)
            cv2.line(canvas, (x2, y2), (x2, y2 - bracket), white, 3)

            # Format label requested by prompt:
            # Video: "ID: 1 | car | 96.4%"
            # Image: "car 95.7%"
            if is_video or "track_id" in det:
                track_id = det.get("track_id", 1)
                label_text = f"ID: {track_id} | {det['class_name']} | {det['confidence']:.1f}%"
            else:
                label_text = f"{det['class_name']} {det['confidence']:.1f}%"

            font_scale = 0.5
            thickness = 1
            font = cv2.FONT_HERSHEY_SIMPLEX
            (text_w, text_h), baseline = cv2.getTextSize(label_text, font, font_scale, thickness)

            badge_y = y1 - 6
            if badge_y - text_h < 0:
                badge_y = y1 + text_h + 8

            # Badge background
            cv2.rectangle(canvas, (x1, badge_y - text_h - 4), (x1 + text_w + 10, badge_y + baseline), (11, 17, 32), -1)
            cv2.rectangle(canvas, (x1, badge_y - text_h - 4), (x1 + text_w + 10, badge_y + baseline), color, 1)

            # Badge text
            cv2.putText(canvas, label_text, (x1 + 5, badge_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

        return canvas

    @staticmethod
    def mat_to_base64(img_bgr: np.ndarray, quality: int = 88) -> str:
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        success, encoded = cv2.imencode(".jpg", img_bgr, encode_params)
        if not success:
            return ""
        b64_str = base64.b64encode(encoded).decode("utf-8")
        return f"data:image/jpeg;base64,{b64_str}"

detector = YOLODetector()

