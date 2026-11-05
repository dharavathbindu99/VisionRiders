import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Camera,
  CameraOff,
  Activity,
  Layers,
  AlertCircle,
  Sliders,
  Maximize,
  ShieldAlert,
  Car,
  Users,
} from 'lucide-react';
import { tfjsDetector } from '../services/tfjsDetector';
import { SimpleByteTracker } from '../services/tracker';
import { Detection } from '../types';
import { historyStorage } from '../services/historyStorage';

export const LiveAnalysisPage: React.FC = () => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [confThreshold, setConfThreshold] = useState<number>(0.35);
  const [showHUD, setShowHUD] = useState<boolean>(true);
  const [activeVehiclesCount, setActiveVehiclesCount] = useState<number>(0);
  const [activePedestriansCount, setActivePedestriansCount] = useState<number>(0);
  const [snapshotTaken, setSnapshotTaken] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<SimpleByteTracker>(new SimpleByteTracker());
  const animationFrameId = useRef<number | null>(null);
  const lastTime = useRef<number>(performance.now());
  const isDetectingRef = useRef<boolean>(false);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setPermissionDenied(false);
    setIsLoadingModel(true);
    try {
      // Warm up model
      await tfjsDetector.loadModel();
      setIsLoadingModel(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // Rear-facing camera if available on mobile/tablet
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          trackerRef.current.reset();
          startDetectionLoop();
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsLoadingModel(false);
      setPermissionDenied(true);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setDetections([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const startDetectionLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const detectFrame = async () => {
      if (!streamRef.current || video.paused || video.ended) {
        return;
      }

      // Sync canvas dimensions
      if (video.videoWidth && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Calculate FPS
      const now = performance.now();
      const delta = now - lastTime.current;
      lastTime.current = now;
      if (delta > 0) {
        setFps(Math.round(1000 / delta));
      }

      // Run detection when previous run completes
      if (!isDetectingRef.current && video.readyState >= 2) {
        isDetectingRef.current = true;
        const detStart = performance.now();
        try {
          const res = await tfjsDetector.detect(video, confThreshold);
          const tracked = trackerRef.current.update(res.detections);
          setDetections(tracked);
          setLatencyMs(Math.round(performance.now() - detStart));

          let vCount = 0;
          let pCount = 0;
          for (const d of tracked) {
            if (d.is_vehicle) vCount++;
            if (d.is_pedestrian) pCount++;
          }
          setActiveVehiclesCount(vCount);
          setActivePedestriansCount(pCount);
        } catch (e) {
          console.warn('Live detection frame error:', e);
        } finally {
          isDetectingRef.current = false;
        }
      }

      // Draw real-time HUD and bounding boxes on canvas
      drawLiveHUD(canvas, detections);

      animationFrameId.current = requestAnimationFrame(detectFrame);
    };

    animationFrameId.current = requestAnimationFrame(detectFrame);
  };

  const drawLiveHUD = (canvas: HTMLCanvasElement, liveDetections: Detection[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw Autonomous Vehicle Perception HUD (Horizon, Corridor, Crosshairs)
    if (showHUD) {
      const cy = h * 0.60;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1;

      // Horizon line
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w * 0.15, cy);
      ctx.lineTo(w * 0.85, cy);
      ctx.stroke();

      // Vehicle path corridor lines
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h);
      ctx.lineTo(w * 0.45, cy);
      ctx.moveTo(w * 0.8, h);
      ctx.lineTo(w * 0.55, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center reticle / crosshairs
      const cx = w / 2;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.moveTo(cx - 30, cy);
      ctx.lineTo(cx + 30, cy);
      ctx.moveTo(cx, cy - 30);
      ctx.lineTo(cx, cy + 30);
      ctx.stroke();
    }

    // 2. Draw Object Tracking Trails
    for (const det of liveDetections) {
      if (det.trail && det.trail.length > 1) {
        ctx.strokeStyle = det.color || '#00F0FF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(det.trail[0][0], det.trail[0][1]);
        for (let i = 1; i < det.trail.length; i++) {
          ctx.lineTo(det.trail[i][0], det.trail[i][1]);
        }
        ctx.stroke();
      }

      // 3. Draw Bounding Boxes with Labels
      const [x1, y1, x2, y2] = det.bbox;
      const boxW = x2 - x1;
      const boxH = y2 - y1;
      const color = det.color || '#00F0FF';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, boxW, boxH);

      // Corner brackets
      const bLen = Math.min(14, boxW / 4, boxH / 4);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + bLen);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + bLen, y1);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(x2 - bLen, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y1 + bLen);
      ctx.stroke();

      // Label: "ID: 1 | car | 96.4%" format specified by prompt
      const labelText = `ID: ${det.track_id || 1} | ${det.class_name} | ${det.confidence.toFixed(1)}%`;
      ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      const textWidth = ctx.measureText(labelText).width;
      const badgeH = 20;

      let badgeY = y1 - badgeH;
      if (badgeY < 2) badgeY = y1 + 2;

      ctx.fillStyle = '#0B1120';
      ctx.fillRect(x1, badgeY, textWidth + 12, badgeH);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, badgeY, textWidth + 12, badgeH);

      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, x1 + 6, badgeY + badgeH / 2);
    }
  };

  // Capture snapshot to history
  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = video.videoWidth || 640;
    snapCanvas.height = video.videoHeight || 480;
    const ctx = snapCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    ctx.drawImage(canvas, 0, 0);
    const dataUrl = snapCanvas.toDataURL('image/jpeg');

    historyStorage.add({
      media_type: 'live',
      filename: `live_capture_${Date.now()}.jpg`,
      thumbnail: dataUrl,
      total_objects: detections.length,
      total_vehicles: activeVehiclesCount,
      total_pedestrians: activePedestriansCount,
      avg_confidence:
        detections.length > 0
          ? Number(
              (
                detections.reduce((acc, d) => acc + d.confidence, 0) /
                detections.length
              ).toFixed(1)
            )
          : 90,
      inference_time_ms: latencyMs,
      model_used: 'TF.js COCO-SSD (Live Webcam)',
      detections: detections,
    });

    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
              <Compass className="w-5 h-5" />
            </span>
            Real-Time Live Sensor Analysis & Camera Stream
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browser camera perception input with real-time bounding boxes, ByteTrack IDs, FPS counter, and latency telemetry.
          </p>
        </div>

        {/* Start / Stop Camera Button */}
        <div className="flex items-center space-x-3">
          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition cursor-pointer"
            >
              <CameraOff className="w-4 h-4 text-rose-400" />
              <span>Stop Camera Stream</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={isLoadingModel}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] transition cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>{isLoadingModel ? 'Initializing Neural Engine...' : 'Request Camera & Start'}</span>
            </button>
          )}
        </div>
      </div>

      {permissionDenied && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <strong className="block font-semibold">Camera Access Blocked</strong>
            Please allow browser camera permissions in your address bar to activate real-time autonomous perception.
          </div>
        </div>
      )}

      {/* Main Live Stream Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col">
            {/* Top Telemetry Overlay */}
            <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-3 text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span>STREAM: {isCameraActive ? 'LIVE ACTIVE' : 'OFFLINE'}</span>
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300 font-bold">FPS: {fps}</span>
                <span className="text-slate-600">|</span>
                <span className="text-cyan-300">LATENCY: {latencyMs}ms</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowHUD(!showHUD)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                    showHUD
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  HUD {showHUD ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Video + Live Canvas Stage */}
            <div className="relative w-full aspect-video flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : 'block'}`}
              />
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none ${
                  !isCameraActive ? 'hidden' : 'block'
                }`}
              />

              {!isCameraActive && (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3 font-mono text-xs">
                  <Camera className="w-12 h-12 stroke-[1.5] text-slate-700" />
                  <span>WEBCAM PERCEPTION SENSOR INACTIVE</span>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-semibold cursor-pointer hover:bg-cyan-500/30 transition"
                  >
                    Allow Camera & Start Stream
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            {isCameraActive && (
              <div className="px-4 py-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-3 text-slate-300">
                  <span>Vehicles: <strong className="text-cyan-400">{activeVehiclesCount}</strong></span>
                  <span>Pedestrians: <strong className="text-emerald-400">{activePedestriansCount}</strong></span>
                  <span>Total Targets: <strong className="text-white">{detections.length}</strong></span>
                </div>

                <button
                  onClick={takeSnapshot}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{snapshotTaken ? 'Snapshot Captured!' : 'Capture Snapshot'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live Telemetry & Target List */}
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
            <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex justify-between">
              <span>Live Sensor Telemetry</span>
              <span className="text-[10px] text-cyan-400">TensorFlow.js COCO-SSD</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">REAL-TIME FPS</span>
                <span className="text-2xl font-extrabold text-cyan-300">{fps}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">LATENCY</span>
                <span className="text-2xl font-extrabold text-emerald-300">{latencyMs}ms</span>
              </div>
            </div>

            {/* Slider */}
            <div className="pt-2">
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-400">Confidence Cutoff:</span>
                <span className="text-cyan-300 font-bold">{Math.round(confThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.80"
                step="0.05"
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Real-Time Detected Objects */}
          <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
            <h3 className="font-bold text-white text-sm">Live Detected Targets</h3>

            {detections.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {isCameraActive ? 'Scanning camera field of view...' : 'Start camera to stream detections.'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {detections.map((det) => (
                  <div
                    key={det.id || det.track_id}
                    className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: det.color || '#00F0FF' }}
                      />
                      <span className="font-bold text-white">ID: {det.track_id || 1}</span>
                      <span className="capitalize text-slate-300">{det.class_name}</span>
                    </div>
                    <span className="text-cyan-300 font-semibold">{det.confidence}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

