import React from 'react';
import {
  Info,
  Cpu,
  Eye,
  Layers,
  GitBranch,
  ShieldCheck,
  Zap,
  Activity,
  Terminal,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 text-slate-200">
      {/* Page Title */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
            <Info className="w-6 h-6" />
          </span>
          About VisionRiders Perception System
        </h2>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Autonomous Vehicle Computer Vision &amp; Deep Multi-Object Tracking Architecture
        </p>
      </div>

      {/* Official Mandatory Project Description */}
      <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 border border-cyan-500/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">Project Abstract</h3>
        <blockquote className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed italic border-l-2 border-cyan-400 pl-4 py-1">
          &ldquo;VisionRiders is an AI-based object detection and tracking system developed for autonomous driving applications. It uses computer vision and deep learning techniques to identify vehicles, pedestrians, traffic signs, traffic lights, and other road objects. The system uses bounding boxes, confidence scores, and object tracking algorithms to understand the surrounding environment and improve autonomous vehicle perception.&rdquo;
        </blockquote>
      </div>

      {/* Technical Architecture Flowchart */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          Autonomous Perception Pipeline Architecture
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs text-center">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center font-bold">
              1
            </div>
            <strong className="text-white block text-sm">Sensor Ingestion</strong>
            <p className="text-[11px] text-slate-400">Dashcam frames, RGB video streams, webcam feeds via OpenCV & HTML5 Canvas</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-blue-500/30 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center font-bold">
              2
            </div>
            <strong className="text-white block text-sm">YOLOv8 Detection</strong>
            <p className="text-[11px] text-slate-400">C2f backbone extracts features; anchor-free head outputs bounding boxes and confidence</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-bold">
              3
            </div>
            <strong className="text-white block text-sm">ByteTrack Association</strong>
            <p className="text-[11px] text-slate-400">Kalman state filter &amp; Hungarian algorithm maintain persistent IDs across occlusions</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-bold">
              4
            </div>
            <strong className="text-white block text-sm">HUD &amp; Planning</strong>
            <p className="text-[11px] text-slate-400">Trajectory trail vectors, corridor bounds, and velocity telemetry visualized</p>
          </div>
        </div>
      </div>

      {/* Deep-Dive Technology Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Computer Vision */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Eye className="w-5 h-5" />
            <h4 className="font-bold text-white text-base">Computer Vision</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Computer vision enables self-driving systems to interpret spatial information from high-resolution digital optical sensors.
            Through spatial convolution, normalization, and color-space representations, pixels are transformed into geometric representations
            of road geometry, obstacle boundaries, lane limits, and semantic scene understanding.
          </p>
        </div>

        {/* YOLO Object Detection */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-blue-400">
            <Cpu className="w-5 h-5" />
            <h4 className="font-bold text-white text-base">YOLO Object Detection</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            You Only Look Once (YOLO) reframes object detection as a single regression task directly from image pixels to bounding box coordinates
            and class probabilities. YOLOv8 utilizes an enhanced CSPDarknet53 backbone with Cross-Stage Partial bottleneck blocks (C2f),
            eliminating anchor boxes for superior inference speed (sub-25ms) crucial for emergency braking and collision avoidance.
          </p>
        </div>

        {/* OpenCV */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Layers className="w-5 h-5" />
            <h4 className="font-bold text-white text-base">OpenCV Image & Video Processing</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            OpenCV (Open Source Computer Vision Library) handles low-level frame decoding, colorspace conversions (BGR to RGB), spatial resampling,
            and matrix annotations. It decodes high-bitrate MP4 and AVI driving streams frame-by-frame and writes annotated bounding boxes with
            sub-pixel precision using optimized C++ kernels.
          </p>
        </div>

        {/* Object Tracking */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400">
            <Activity className="w-5 h-5" />
            <h4 className="font-bold text-white text-base">Object Tracking (ByteTrack &amp; DeepSORT)</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Multi-Object Tracking (MOT) links bounding boxes across sequential video frames to maintain identity consistency. ByteTrack achieves
            state-of-the-art results by associating almost every detection box (both high-confidence and low-confidence detections) using
            Kalman filter motion state estimation and the Hungarian bipartite matching algorithm, drastically reducing ID switches.
          </p>
        </div>
      </div>

      {/* Autonomous Driving Applications */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h4 className="font-bold text-white text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Autonomous Driving Applications
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <strong className="text-cyan-300 block">Vulnerable Road User (VRU) Safety</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Detects pedestrians, cyclists, and animals near curbs and crosswalks to trigger automatic emergency braking (AEB).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <strong className="text-blue-300 block">Adaptive Cruise &amp; Overtaking</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tracks leading vehicles and estimates relative velocity vectors to maintain safe following distances and execute highway lane changes.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <strong className="text-emerald-300 block">Traffic Flow &amp; Infrastructure</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Classifies active traffic light states (Red/Amber/Green) and road signage to ensure full regulatory road compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

