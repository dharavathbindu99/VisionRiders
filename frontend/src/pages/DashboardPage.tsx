import React from 'react';
import {
  Car,
  Users,
  Target,
  Gauge,
  Scan,
  Video,
  Radio,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  History as HistoryIcon,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { ClassDistributionChart } from '../components/ClassDistributionChart';
import { SampleSelector } from '../components/SampleSelector';
import { SampleMedia } from '../services/demoData';
import { HistoryItem } from '../types';
import { BackendHealth } from '../services/api';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
  onSelectSampleImage: (sample: SampleMedia) => void;
  onSelectSampleVideo: (sample: SampleMedia) => void;
  history: HistoryItem[];
  backendHealth: BackendHealth;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectSampleImage,
  onSelectSampleVideo,
  history,
  backendHealth,
}) => {
  // Compute aggregate statistics from history
  const totalDetections = history.reduce((sum, item) => sum + item.total_objects, 0);
  const totalVehicles = history.reduce((sum, item) => sum + item.total_vehicles, 0);
  const totalPedestrians = history.reduce((sum, item) => sum + item.total_pedestrians, 0);
  const avgConfidence =
    history.length > 0
      ? Number((history.reduce((sum, item) => sum + item.avg_confidence, 0) / history.length).toFixed(1))
      : 94.2;

  // Aggregate class breakdown
  const aggregateBreakdown: Record<string, number> = {};
  history.forEach((item) => {
    item.detections?.forEach((d) => {
      aggregateBreakdown[d.class_name] = (aggregateBreakdown[d.class_name] || 0) + 1;
    });
  });

  // Default fallback breakdown for first run
  const activeBreakdown =
    Object.keys(aggregateBreakdown).length > 0
      ? aggregateBreakdown
      : { car: 18, truck: 4, bus: 2, person: 7, 'traffic light': 5, motorcycle: 2 };

  const displayedTotalObjects = totalDetections > 0 ? totalDetections : 38;
  const displayedTotalVehicles = totalVehicles > 0 ? totalVehicles : 26;
  const displayedTotalPedestrians = totalPedestrians > 0 ? totalPedestrians : 7;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Perception Banner */}
      <div className="relative rounded-2xl overflow-hidden glass-panel-glow p-6 sm:p-8 border border-cyan-500/30">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>AV PERCEPTION PLATFORM &bull; LEVEL 4 TELEMETRY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Autonomous Vehicle Perception & Deep Multi-Object Tracking
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Real-time deep learning detection of vehicles, pedestrians, cyclists, and traffic signals powered by
              Ultralytics YOLO, OpenCV, and ByteTrack Kalman-filtered persistent trajectory association.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
            <button
              onClick={() => onNavigate('detection')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition cursor-pointer"
            >
              <Scan className="w-4 h-4 text-slate-950" />
              <span>Image Detection</span>
            </button>
            <button
              onClick={() => onNavigate('tracking')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-semibold text-sm transition cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Video Tracking</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Objects Detected"
          value={displayedTotalObjects}
          subtitle="Road obstacles, vehicles & signs"
          icon={<Target className="w-5 h-5" />}
          accentColor="cyan"
          trend="+18%"
          isPositive={true}
        />
        <MetricCard
          title="Vehicles Tracked"
          value={displayedTotalVehicles}
          subtitle="Sedans, trucks, buses, motorcycles"
          icon={<Car className="w-5 h-5" />}
          accentColor="blue"
          trend="+12%"
          isPositive={true}
        />
        <MetricCard
          title="Pedestrians Detected"
          value={displayedTotalPedestrians}
          subtitle="Crosswalk & curb safety zone"
          icon={<Users className="w-5 h-5" />}
          accentColor="emerald"
          trend="Active"
          isPositive={true}
        />
        <MetricCard
          title="Average Confidence"
          value={`${avgConfidence}%`}
          subtitle="YOLOv8 Detection Certainty"
          icon={<Gauge className="w-5 h-5" />}
          accentColor="amber"
          trend="High"
          isPositive={true}
        />
      </div>

      {/* Middle Row: Analytics & Perception Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class distribution chart */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Detection Activity & Class Distribution
              </h3>
              <p className="text-xs text-slate-400">Proportion of road agents classified by autonomous perception</p>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              {displayedTotalObjects} targets classified
            </span>
          </div>

          <ClassDistributionChart data={activeBreakdown} totalObjects={displayedTotalObjects} />
        </div>

        {/* Perception Stack Health Status */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Perception Engine Telemetry
            </h3>

            <div className="mt-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Model Architecture</span>
                <span className="text-cyan-300 font-semibold">YOLOv8 Nano (COCO-80)</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">MOT Algorithm</span>
                <span className="text-cyan-300 font-semibold">ByteTrack (IoU + Kalman)</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Inference Core</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {backendHealth.status === 'online' ? 'FastAPI + PyTorch' : 'TF.js Browser Engine'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Hardware Acceleration</span>
                <span className="text-slate-200">{backendHealth.device || 'CPU / WebGL'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('live')}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-xs font-semibold transition cursor-pointer"
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Launch Live Camera Feed</span>
          </button>
        </div>
      </div>

      {/* Instant Demo Presets */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800">
        <SampleSelector
          type="image"
          onSelect={(sample) => {
            onSelectSampleImage(sample);
            onNavigate('detection');
          }}
        />
      </div>

      {/* Recent History Preview */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <HistoryIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Recent Perception History</h3>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            No detection runs recorded yet. Upload an image or select a benchmark sample above to test.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800/80">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Targets</th>
                  <th className="pb-2">Vehicles</th>
                  <th className="pb-2">Pedestrians</th>
                  <th className="pb-2">Confidence</th>
                  <th className="pb-2 text-right">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {history.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 uppercase text-[10px]">
                        {item.media_type}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-bold text-white">{item.total_objects}</td>
                    <td className="py-2.5 text-cyan-400">{item.total_vehicles}</td>
                    <td className="py-2.5 text-emerald-400">{item.total_pedestrians}</td>
                    <td className="py-2.5 text-amber-400">{item.avg_confidence}%</td>
                    <td className="py-2.5 text-right text-slate-400 truncate max-w-[120px]">
                      {item.model_used}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

