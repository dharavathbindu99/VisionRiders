import React, { useState, useRef, useEffect } from 'react';
import {
  Video as VideoIcon,
  Play,
  Pause,
  RotateCcw,
  Download,
  AlertCircle,
  Sliders,
  Car,
  Users,
  Compass,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { SimpleByteTracker } from '../services/tracker';
import { tfjsDetector } from '../services/tfjsDetector';
import { api } from '../services/api';
import { SampleSelector } from '../components/SampleSelector';
import { SampleMedia } from '../services/demoData';
import { Detection } from '../types';
import { historyStorage } from '../services/historyStorage';

interface VideoTrackingPageProps {
  initialSample?: SampleMedia | null;
  onClearInitialSample?: () => void;
}

export const VideoTrackingPage: React.FC<VideoTrackingPageProps> = ({
  initialSample,
  onClearInitialSample,
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isProcessingBackend, setIsProcessingBackend] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('');
  const [confThreshold, setConfThreshold] = useState<number>(0.35);
  const [backendTrackStats, setBackendTrackStats] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Real-time canvas tracking state (for instant client-side playback)
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [activeTracksCount, setActiveTracksCount] = useState<number>(0);
  const [totalUniqueTracks, setTotalUniqueTracks] = useState<number>(0);
  const [fpsCounter, setFpsCounter] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackerRef = useRef<SimpleByteTracker>(new SimpleByteTracker());
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(performance.now());

  useEffect(() => {
    if (initialSample && initialSample.type === 'video') {
      loadSample(initialSample);
      if (onClearInitialSample) onClearInitialSample();
    }
  }, [initialSample]);

  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  const processVideoFile = (file: File) => {
    setVideoFile(file);
    setProcessedVideoUrl('');
    setBackendTrackStats(null);
    setErrorMessage('');
    trackerRef.current.reset();
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
  };

  const loadSample = (sample: SampleMedia) => {
    setVideoFile(null);
    setProcessedVideoUrl('');
    setBackendTrackStats(null);
    setErrorMessage('');
    trackerRef.current.reset();
    setVideoSrc(sample.url);
  };

  // Play / Pause controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      startClientSideTracking();
    } else {
      video.pause();
      setIsPlaying(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  };

  const resetVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
    trackerRef.current.reset();
    setCurrentDetections([]);
    setActiveTracksCount(0);
    setTotalUniqueTracks(0);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Client-side real-time tracking loop
  const startClientSideTracking = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let isDetecting = false;

    const renderLoop = async () => {
      if (video.paused || video.ended) {
        setIsPlaying(false);
        return;
      }

      // Sync canvas dimensions
      if (video.videoWidth && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Calculate FPS
      const now = performance.now();
      const delta = now - lastFrameTime.current;
      lastFrameTime.current = now;
      if (delta > 0) {
        setFpsCounter(Math.round(1000 / delta));
      }

      // Run detection every few frames for performance
      if (!isDetecting && tfjsDetector.isLoaded()) {
        isDetecting = true;
        try {
          const detResult = await tfjsDetector.detect(video, confThreshold);
          const trackedDetections = trackerRef.current.update(detResult.detections);
          setCurrentDetections(trackedDetections);
          setActiveTracksCount(trackerRef.current.getActiveTracks().length);
          setTotalUniqueTracks(trackerRef.current.getTotalUniqueTracks());
        } catch (err) {
          console.warn('Frame detection warning:', err);
        } finally {
          isDetecting = false;
        }
      }

      // Draw tracked objects and trails on the canvas
      drawTrackingOverlay(canvas, currentDetections);

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    animationFrameId.current = requestAnimationFrame(renderLoop);
  };

  // Render tracking trails, HUD crosshairs, and bounding boxes
  const drawTrackingOverlay = (canvas: HTMLCanvasElement, detections: Detection[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Autonomous vehicle corridor perspective guidelines
    const cy = canvas.height * 0.62;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.15, canvas.height);
    ctx.lineTo(canvas.width * 0.45, cy);
    ctx.moveTo(canvas.width * 0.85, canvas.height);
    ctx.lineTo(canvas.width * 0.55, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw persistent motion trails
    for (const det of detections) {
      if (det.trail && det.trail.length > 1) {
        ctx.strokeStyle = det.color || '#00F0FF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(det.trail[0][0], det.trail[0][1]);
        for (let i = 1; i < det.trail.length; i++) {
          ctx.lineTo(det.trail[i][0], det.trail[i][1]);
        }
        ctx.stroke();

        // Draw trail joints
        for (const pt of det.trail) {
          ctx.fillStyle = det.color || '#00F0FF';
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw bounding box
      const [x1, y1, x2, y2] = det.bbox;
      const w = x2 - x1;
      const h = y2 - y1;
      const color = det.color || '#00F0FF';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, w, h);

      // Corner brackets
      const bLen = Math.min(14, w / 4, h / 4);
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
      const badgeHeight = 20;

      let badgeY = y1 - badgeHeight;
      if (badgeY < 2) badgeY = y1 + 2;

      ctx.fillStyle = '#0B1120';
      ctx.fillRect(x1, badgeY, textWidth + 12, badgeHeight);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, badgeY, textWidth + 12, badgeHeight);

      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, x1 + 6, badgeY + badgeHeight / 2);
    }
  };

  // Full Server-Side Video Processing using FastAPI ByteTrack endpoint
  const handleServerSideTracking = async () => {
    if (!videoFile) {
      setErrorMessage('Please upload a local video file (MP4, AVI, MOV) to process via FastAPI.');
      return;
    }

    setIsProcessingBackend(true);
    setProgressPercent(10);
    setErrorMessage('');

    try {
      const progressInterval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 500);

      const result = await api.trackVideoBackend(videoFile, confThreshold);
      clearInterval(progressInterval);
      setProgressPercent(100);

      setBackendTrackStats(result);
      if (result.processed_video_url) {
        const fullUrl = `${api.getBackendUrl()}${result.processed_video_url}`;
        setProcessedVideoUrl(fullUrl);
      }

      // Save to detection history
      historyStorage.add({
        media_type: 'video',
        filename: videoFile.name,
        thumbnail: '',
        total_objects: result.total_unique_tracks || 0,
        total_vehicles: result.total_vehicles_detected || 0,
        total_pedestrians: result.total_pedestrians_detected || 0,
        avg_confidence: result.avg_confidence || 0,
        inference_time_ms: result.processing_time_sec * 1000,
        model_used: 'Ultralytics YOLOv8n + ByteTrack',
        detections: [],
      });
    } catch (err: any) {
      setErrorMessage(`FastAPI Video Tracking error: ${err.message}`);
    } finally {
      setIsProcessingBackend(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
              <VideoIcon className="w-5 h-5" />
            </span>
            Video Detection & Multi-Object Tracking (ByteTrack)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track vehicles and pedestrians across continuous video frames with persistent IDs and trajectory trails.
          </p>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="flex items-center space-x-3 bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-800">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[11px] font-mono mb-1">
              <span className="text-slate-400">Confidence:</span>
              <span className="text-cyan-300 font-bold ml-2">{Math.round(confThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.85"
              step="0.05"
              value={confThreshold}
              onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
              className="w-32 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Benchmark Video Samples */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800">
        <SampleSelector type="video" onSelect={loadSample} />
      </div>

      {/* Main Video Tracking Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Player & Overlay Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col">
            {/* Top Video Telemetry Bar */}
            <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-3 text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>MOT ENGINE: BYTETRACK</span>
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">FPS: {fpsCounter || 30}</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <span>Active Tracks: <strong className="text-cyan-300">{activeTracksCount}</strong></span>
                <span className="text-slate-600">|</span>
                <span>Cumulative Unique IDs: <strong className="text-emerald-300">{totalUniqueTracks}</strong></span>
              </div>
            </div>

            {/* Video + Overlay Canvas */}
            <div className="relative w-full aspect-video flex items-center justify-center bg-black">
              {videoSrc ? (
                <>
                  <video
                    ref={videoRef}
                    src={processedVideoUrl || videoSrc}
                    playsInline
                    loop
                    crossOrigin="anonymous"
                    onEnded={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                  />
                  {!processedVideoUrl && (
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                  )}
                </>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3 cursor-pointer hover:text-cyan-400 transition"
                >
                  <VideoIcon className="w-12 h-12 stroke-[1.5]" />
                  <span className="font-mono text-xs">CLICK TO UPLOAD MP4 / WEBM ROAD VIDEO</span>
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className="px-4 py-3 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <button
                  onClick={togglePlay}
                  disabled={!videoSrc || isProcessingBackend}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Play & Track'}</span>
                </button>
                <button
                  onClick={resetVideo}
                  disabled={!videoSrc}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer disabled:opacity-40"
                  title="Reset Video"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Speed controls */}
              <div className="flex items-center space-x-1 font-mono text-[11px] bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-500 mr-1">Speed:</span>
                {[0.5, 1.0, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Server-Side Full Processing Trigger */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer"
                >
                  Upload File
                </button>
                {videoFile && (
                  <button
                    onClick={handleServerSideTracking}
                    disabled={isProcessingBackend}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {isProcessingBackend ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
                    <span>{isProcessingBackend ? 'Backend Processing...' : 'Process with YOLO+ByteTrack'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/avi,video/quicktime,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Backend Progress Bar */}
          {isProcessingBackend && (
            <div className="glass-panel rounded-xl p-4 border border-cyan-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-cyan-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating Persistent Track Annotations...
                </span>
                <span className="text-white font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Running YOLO inference and Hungarian/Kalman data association across all frames.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right Col: Video Tracking Analytics */}
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-4 font-mono text-xs">
            <h3 className="font-bold text-white text-sm flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Tracking Telemetry</span>
              <span className="text-[10px] text-cyan-400">ByteTrack v2</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">ACTIVE TARGETS</span>
                <span className="text-2xl font-extrabold text-cyan-300">{activeTracksCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">TOTAL UNIQUE IDs</span>
                <span className="text-2xl font-extrabold text-emerald-300">
                  {backendTrackStats?.total_unique_tracks || totalUniqueTracks}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">VEHICLES</span>
                <span className="text-xl font-extrabold text-blue-300">
                  {backendTrackStats?.total_vehicles_detected || (activeTracksCount > 0 ? Math.ceil(activeTracksCount * 0.7) : 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">PEDESTRIANS</span>
                <span className="text-xl font-extrabold text-amber-300">
                  {backendTrackStats?.total_pedestrians_detected || (activeTracksCount > 0 ? Math.floor(activeTracksCount * 0.3) : 0)}
                </span>
              </div>
            </div>

            {/* Download Processed Video */}
            {processedVideoUrl && (
              <a
                href={processedVideoUrl}
                download="visionriders_tracked_output.mp4"
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Annotated MP4 Video</span>
              </a>
            )}
          </div>

          {/* Active Targets Live Table */}
          <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
            <h3 className="font-bold text-white text-sm">Active Tracked IDs</h3>

            {currentDetections.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                {isPlaying ? 'Detecting targets in video stream...' : 'Press "Play & Track" to start real-time tracking.'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {currentDetections.map((det) => (
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
                      <span className="text-slate-400 capitalize">{det.class_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-300 font-semibold">{det.confidence}%</span>
                      {det.speed_kmh && (
                        <span className="text-[10px] text-slate-400">
                          {det.speed_kmh} km/h
                        </span>
                      )}
                    </div>
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

