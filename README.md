# VisionRiders – AI-Powered Autonomous Perception

> **Intelligent Object Detection & Tracking for Self-Driving Cars**

![VisionRiders Perception Platform](https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=1200&auto=format&fit=crop)

---

## 1. Project Overview

**VisionRiders** is an AI-based object detection and tracking system developed for autonomous driving applications. It uses computer vision and deep learning techniques to identify vehicles, pedestrians, traffic signs, traffic lights, and other road objects. The system uses bounding boxes, confidence scores, and object tracking algorithms to understand the surrounding environment and improve autonomous vehicle perception.

Designed with a futuristic **autonomous vehicle HUD perception dashboard** aesthetic (dark navy/black theme, cyan and electric blue accents, glassmorphism cards, and live telemetry), VisionRiders delivers millisecond-level inference, persistent trajectory tracking across occlusions, and real-time webcam analysis.

---

## 2. Key Features

### 📊 Perception Dashboard
- Real-time KPI telemetry: Total Objects Detected, Vehicles Tracked, Pedestrians Detected, and Average Confidence.
- Dynamic Class Distribution stacked visualizer (vehicles, pedestrians, cyclists, signals).
- AI Core Engine health indicator monitoring FastAPI, PyTorch (CUDA/CPU), and browser neural fallbacks.
- Instant 1-Click benchmark sample tests.

### 🖼️ Image Object Detection Module
- Supports **JPG, JPEG, PNG, and WEBP** images with drag-and-drop or file upload.
- Displays real YOLOv8/COCO predictions with exact millimeter bounding boxes and cyber corner brackets.
- Labels formatted with model confidence scores:
  - `car 95.7%`
  - `person 89.2%`
  - `traffic light 93.4%`
- Interactive confidence cutoff slider (10% to 90%).
- Filter targets by category (Vehicles, Pedestrians, Traffic Signals).
- One-click export and download of high-resolution annotated imagery.
- Automatically archives detection runs to local history.

### 🎥 Video Detection & Tracking Module (ByteTrack)
- Supports **MP4, AVI, MOV, and WEBM** driving videos.
- Deep Multi-Object Tracking using the **ByteTrack** algorithm with Kalman filtering and Hungarian data association.
- Assigns persistent, unique tracking IDs across frames:
  - `ID: 1 | car | 96.4%`
  - `ID: 2 | person | 91.7%`
  - `ID: 3 | motorcycle | 87.9%`
- Renders glowing neon motion trajectory trails showing the historical path of each moving vehicle or pedestrian.
- Video playback controls: Play, pause, seek, reset, and speed multipliers (0.5x, 1x, 2x).
- Background video processing progress bar with estimated time and frame counters.
- Generates downloadable annotated MP4 videos.

### 🧭 Real-Time Live Webcam Analysis
- Direct browser camera access (`getUserMedia`) with clear permission prompt.
- Real-time client-side inference using TensorFlow.js COCO-SSD with zero latency bottleneck.
- Autonomous Driving HUD overlay: artificial horizon, corridor guidelines, target lock brackets, and center reticle.
- Real-time **FPS counter** and **detection latency (ms)** telemetry.
- Snapshot capture tool to freeze and archive annotated frames to history.

### 📜 Detection History & Archive
- Persistent local storage archive of previous image, video, and live webcam analyses.
- Stores thumbnails, timestamps, class counts, average confidence, and detection metadata.
- Search by class or filename, filter by media type, re-inspect target details, or clear history.

### ⚙️ System Settings
- Configurable confidence and Non-Maximum Suppression (IoU) thresholds.
- Live backend connection testing for FastAPI endpoints (`http://localhost:8000`).
- Toggle HUD guidelines, motion trails, and visual elements.

---

## 3. Technology Stack

### Frontend:
- **Framework**: React 19 with Vite (TypeScript)
- **Styling**: Tailwind CSS v4 (Glassmorphism, custom cyber HUD grids)
- **Icons**: Lucide React
- **Client-Side Neural Fallback**: TensorFlow.js (`@tensorflow/tfjs`) + `@tensorflow-models/coco-ssd`
- **Client-Side Tracking**: Custom ByteTrack Kalman & IoU tracker

### Backend:
- **API Framework**: FastAPI & Uvicorn (Asynchronous REST API)
- **Machine Learning Core**: Ultralytics YOLOv8 (`yolov8n.pt` COCO pretrained model)
- **Deep Learning Runtime**: PyTorch 2.15 & Torchvision
- **Computer Vision**: OpenCV (`cv2`) for frame decoding, trajectory drawing, and video encoding
- **Data Validation**: Pydantic v2

---

## 4. Repository Structure

```
VisionRiders/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application & API endpoints
│   │   ├── detector.py      # Ultralytics YOLO detector & drawing utilities
│   │   ├── tracker.py       # ByteTrack MOT implementation & trajectory state
│   │   └── models.py        # Pydantic schemas for requests & responses
│   ├── models/
│   │   └── yolov8n.pt       # Pre-cached YOLOv8 weights (COCO 80 classes)
│   ├── samples/             # Offline benchmark road imagery & test video
│   ├── output/              # Processed annotated MP4 videos directory
│   ├── requirements.txt     # Python dependencies
│   └── run.py               # Backend startup script
├── frontend/
│   ├── src/
│   │   ├── components/      # Sidebar, Navbar, DetectionCanvas, MetricCard, etc.
│   │   ├── pages/           # Dashboard, Detection, Tracking, Live, History, About, Settings
│   │   ├── services/        # api.ts, tfjsDetector.ts, tracker.ts, historyStorage.ts
│   │   ├── types/           # TypeScript interfaces & types
│   │   ├── App.tsx          # Root application component
│   │   ├── main.tsx         # React entrypoint
│   │   └── index.css        # Cyberpunk glassmorphism styling
│   ├── public/
│   │   └── samples/         # Demo road images and driving video
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── .env.example             # Environment variables template
├── requirements.txt         # Root Python requirements mirror
├── package.json             # Root workspace package scripts
└── README.md
```

---

## 5. Local Setup & Installation

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Python**: 3.10 to 3.14 (tested on Python 3.14)
- **pip** and **npm**

---

### Step 1: Clone or Navigate to the Project

```bash
cd VisionRiders
```

---

### Step 2: Start the FastAPI Backend

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the FastAPI backend server:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   Or simply:
   ```bash
   python run.py
   ```

   The backend will be live at:
   - API Root: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/health`

---

### Step 3: Start the React Frontend

Open a new terminal window:

1. Install frontend packages:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

   The frontend will be live at:
   - Dashboard: `http://localhost:5173`

---

## 6. Backend API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status, loaded YOLO model, device (CPU/CUDA), classes |
| `GET` | `/models` | Available perception models and parameter counts |
| `POST` | `/detect/image` | Runs YOLOv8 on uploaded image; returns bboxes, labels, confidence, base64 image |
| `POST` | `/track/video` | Runs YOLOv8 + ByteTrack; assigns unique IDs, motion trails, returns MP4 URL |
| `POST` | `/detect/video` | Alias endpoint for video tracking |
| `GET` | `/output/{file}` | Serves processed annotated MP4 video files |

### Example cURL: Image Detection
```bash
curl -X POST "http://localhost:8000/detect/image" \
  -F "file=@road_sample.jpg" \
  -F "confidence=0.35"
```

### Example Response:
```json
{
  "detections": [
    {
      "id": "det_0",
      "class_name": "car",
      "confidence": 95.7,
      "bbox": [182, 221, 301, 298],
      "is_vehicle": true,
      "is_pedestrian": false
    },
    {
      "id": "det_1",
      "class_name": "person",
      "confidence": 89.2,
      "bbox": [102, 204, 129, 278],
      "is_vehicle": false,
      "is_pedestrian": true
    }
  ],
  "image_width": 640,
  "image_height": 360,
  "inference_time_ms": 32.4,
  "summary": {
    "total_objects": 2,
    "total_vehicles": 1,
    "total_pedestrians": 1,
    "total_traffic_elements": 0,
    "avg_confidence": 92.5
  },
  "model_name": "Ultralytics YOLOv8n (COCO)",
  "source": "fastapi"
}
```

---

## 7. Autonomous Driving Perception Pipeline

```
  [ Optical Sensor / Camera ] 
             │
             ▼
  [ OpenCV Frame Decoding ] ──────────────┐
             │                            │
             ▼                            ▼
  [ YOLOv8 Neural Backbone ]     [ Colorspace Preprocessing ]
             │
             ▼
  [ Anchor-Free Detection Head ]
  • Coordinates (x1, y1, x2, y2)
  • Class (car, person, sign)
  • Real Confidence %
             │
             ▼
  [ ByteTrack Multi-Object Tracking ]
  • Kalman State Filter (Position + Velocity)
  • Hungarian Bipartite Association
  • Persistent ID Assignment & Motion Trails
             │
             ▼
  [ Autonomous HUD Perception Interface ]
```

---

## 8. License

VisionRiders is released under the **MIT License**. Built for autonomous driving research, computer vision benchmarking, and academic machine learning demonstrations.

