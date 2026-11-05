import os
import shutil
import tempfile
import time
from typing import Optional, List, Dict
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.detector import detector, VEHICLE_CLASSES, PEDESTRIAN_CLASSES, TRAFFIC_CLASSES
from app.tracker import ByteTrackerPy
from app.models import HealthResponse, ImageDetectionResponse, DetectionItem, DetectionSummary

app = FastAPI(
    title="VisionRiders AI Autonomous Perception API",
    description="FastAPI + Ultralytics YOLO + ByteTrack Perception Stack for Autonomous Vehicles",
    version="2.4.0"
)

# Enable CORS for frontend Vite dev server & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Output directory for processed media
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "output"))
os.makedirs(OUTPUT_DIR, exist_ok=True)
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health status and perception model information."""
    supported = detector.get_supported_classes()
    return HealthResponse(
        status="online",
        model_loaded="Ultralytics YOLOv8n",
        device=detector.device.upper(),
        cuda_available=detector.device == "cuda",
        total_classes=len(supported),
        supported_classes=supported[:20]  # First 20 as sample
    )

@app.get("/models")
def list_models():
    """Returns available vision models."""
    return {
        "current_model": "yolov8n.pt",
        "available_models": [
            {"id": "yolov8n", "name": "YOLOv8 Nano (Fastest, Edge Optimized)", "parameters": "3.2M", "size_mb": 6.5},
            {"id": "yolov8s", "name": "YOLOv8 Small (Balanced Perception)", "parameters": "11.2M", "size_mb": 22.5},
            {"id": "yolo11n", "name": "YOLO11 Nano (Next-Gen Autonomous Architecture)", "parameters": "2.6M", "size_mb": 5.4}
        ]
    }

@app.post("/detect/image", response_model=ImageDetectionResponse)
async def detect_image(
    file: UploadFile = File(...),
    confidence: float = Form(0.35),
    iou: float = Form(0.45)
):
    """
    Detects road objects (vehicles, pedestrians, signs, lights) in an uploaded image.
    Returns bounding boxes, confidence scores, and base64 annotated image.
    """
    # Validate mime type
    valid_types = ["image/jpeg", "image/png", "image/webp", "image/bmp"]
    if file.content_type and file.content_type not in valid_types:
        # Check file extension as secondary check
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            raise HTTPException(status_code=400, detail="Invalid image file format. Supported: JPG, PNG, WEBP.")

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        h, w = img_bgr.shape[:2]

        # Run YOLO detection
        raw_detections, inference_time_ms = detector.detect_image_cv(img_bgr, conf_threshold=confidence, iou_threshold=iou)

        # Generate annotated image
        annotated_bgr = detector.draw_annotations(img_bgr, raw_detections, is_video=False, show_hud=True)
        annotated_base64 = detector.mat_to_base64(annotated_bgr)

        # Calculate metrics summary
        total_veh = 0
        total_ped = 0
        total_traff = 0
        conf_sum = 0.0
        breakdown: Dict[str, int] = {}

        detection_items: List[DetectionItem] = []
        for d in raw_detections:
            cls = d["class_name"]
            is_v = d["is_vehicle"]
            is_p = d["is_pedestrian"]
            is_t = cls in TRAFFIC_CLASSES

            if is_v: total_veh += 1
            if is_p: total_ped += 1
            if is_t: total_traff += 1
            conf_sum += d["confidence"]
            breakdown[cls] = breakdown.get(cls, 0) + 1

            detection_items.append(DetectionItem(
                id=d["id"],
                class_name=cls,
                confidence=d["confidence"],
                bbox=d["bbox"],
                is_vehicle=is_v,
                is_pedestrian=is_p
            ))

        total_objs = len(detection_items)
        avg_conf = round(conf_sum / total_objs, 1) if total_objs > 0 else 0.0

        summary = DetectionSummary(
            total_objects=total_objs,
            total_vehicles=total_veh,
            total_pedestrians=total_ped,
            total_traffic_elements=total_traff,
            avg_confidence=avg_conf,
            classes_breakdown=breakdown
        )

        return ImageDetectionResponse(
            detections=detection_items,
            image_width=w,
            image_height=h,
            inference_time_ms=inference_time_ms,
            annotated_image_base64=annotated_base64,
            summary=summary,
            model_name="Ultralytics YOLOv8n (COCO)",
            source="fastapi"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image detection error: {str(e)}")

@app.post("/track/video")
async def track_video(
    file: UploadFile = File(...),
    confidence: float = Form(0.35),
    max_frames: int = Form(180)  # Safe frame limit for fast responsive web processing
):
    """
    Processes video frames with YOLO + ByteTrack tracking algorithm.
    Assigns persistent IDs, draws motion trails, and produces annotated video output.
    """
    valid_exts = [".mp4", ".avi", ".mov", ".webm", ".mkv"]
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail="Invalid video format. Supported: MP4, AVI, MOV, WEBM.")

    # Save uploaded video to temp file
    temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        shutil.copyfileobj(file.file, temp_input)
        temp_input.close()

        cap = cv2.VideoCapture(temp_input.name)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Failed to open video file.")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        frames_to_process = min(total_video_frames if total_video_frames > 0 else 150, max_frames)

        output_filename = f"tracked_{int(time.time())}.mp4"
        output_filepath = os.path.join(OUTPUT_DIR, output_filename)

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(output_filepath, fourcc, fps, (width, height))

        tracker = ByteTrackerPy(max_age=20, min_hits=1, iou_thresh=0.3)

        frame_count = 0
        total_vehicles_seen = set()
        total_pedestrians_seen = set()
        conf_sum = 0.0
        conf_count = 0
        frame_detections_summary = []

        start_time = time.time()

        while frame_count < frames_to_process:
            ret, frame = cap.read()
            if not ret:
                break

            # Run YOLO detection on frame
            raw_dets, _ = detector.detect_image_cv(frame, conf_threshold=confidence)

            # Update ByteTracker
            active_tracks = tracker.update(raw_dets)

            # Convert active tracks to format for drawing
            render_dets = []
            for trk in active_tracks:
                if trk.is_vehicle:
                    total_vehicles_seen.add(trk.track_id)
                if trk.is_pedestrian:
                    total_pedestrians_seen.add(trk.track_id)

                conf_sum += trk.confidence
                conf_count += 1

                render_dets.append({
                    "track_id": trk.track_id,
                    "class_name": trk.class_name,
                    "confidence": trk.confidence,
                    "bbox": trk.bbox,
                    "color_bgr": trk.color_bgr,
                    "trail": trk.trail,
                    "speed_kmh": trk.speed_kmh,
                    "is_vehicle": trk.is_vehicle,
                    "is_pedestrian": trk.is_pedestrian
                })

            # Draw annotations with persistent tracking IDs & trails
            annotated_frame = detector.draw_annotations(frame, render_dets, is_video=True, show_hud=True)
            writer.write(annotated_frame)

            if frame_count % 5 == 0:
                frame_detections_summary.append({
                    "frame": frame_count,
                    "active_tracks_count": len(render_dets),
                    "detections": [{
                        "track_id": d["track_id"],
                        "class_name": d["class_name"],
                        "confidence": d["confidence"],
                        "bbox": d["bbox"],
                        "speed_kmh": d["speed_kmh"]
                    } for d in render_dets]
                })

            frame_count += 1

        cap.release()
        writer.release()
        total_duration = time.time() - start_time

        avg_conf = round(conf_sum / conf_count, 1) if conf_count > 0 else 0.0

        return {
            "status": "success",
            "total_frames_processed": frame_count,
            "original_fps": round(fps, 1),
            "video_width": width,
            "video_height": height,
            "processing_time_sec": round(total_duration, 2),
            "total_unique_tracks": tracker.next_id - 1,
            "total_vehicles_detected": len(total_vehicles_seen),
            "total_pedestrians_detected": len(total_pedestrians_seen),
            "avg_confidence": avg_conf,
            "processed_video_url": f"/output/{output_filename}",
            "frames_sample": frame_detections_summary
        }
    finally:
        if os.path.exists(temp_input.name):
            try:
                os.remove(temp_input.name)
            except Exception:
                pass

@app.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    confidence: float = Form(0.35)
):
    """Alias for /track/video to satisfy requirement for /detect/video."""
    return await track_video(file=file, confidence=confidence)

