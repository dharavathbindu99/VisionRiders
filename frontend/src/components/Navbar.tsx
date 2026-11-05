import React, { useState, useEffect } from 'react';
import { Activity, Radio, Cpu, RefreshCw, Car } from 'lucide-react';
import { BackendHealth } from '../services/api';

interface NavbarProps {
  backendHealth: BackendHealth;
  onRefreshHealth: () => void;
  onQuickDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  backendHealth,
  onRefreshHealth,
  onQuickDemo,
}) => {
  const [telemetryTime, setTelemetryTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTelemetryTime(now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100));
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-cyan-500/20 bg-[#070b14]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Branding & Subtitle */}
      <div className="flex items-center space-x-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>VisionRiders</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                v2.4 Perception
              </span>
            </h1>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="text-xs text-cyan-300/80 font-medium hidden md:inline">
              AI-Powered Autonomous Perception
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden lg:block">
            Intelligent Object Detection & Tracking for Self-Driving Cars
          </p>
        </div>
      </div>

      {/* Right: Telemetry stream & quick demo */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Quick Demo Button */}
        {onQuickDemo && (
          <button
            onClick={onQuickDemo}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-medium transition cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          >
            <Car className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Instant Demo</span>
          </button>
        )}

        {/* Telemetry clock */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-400">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>TEL: {telemetryTime}</span>
        </div>

        {/* Backend health status badge */}
        <button
          onClick={onRefreshHealth}
          title="Click to re-ping backend"
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 transition cursor-pointer"
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              backendHealth.status === 'online' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
            }`}
          />
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 uppercase font-mono leading-none">Inference Engine</span>
            <span className="text-[11px] font-semibold text-slate-200">
              {backendHealth.status === 'online' ? 'FastAPI YOLO' : 'TF.js COCO-SSD'}
            </span>
          </div>
          <RefreshCw className="w-3 h-3 text-slate-500 hover:text-cyan-400" />
        </button>

        {/* Device Status */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px]">{backendHealth.device || 'WebGL/CPU'}</span>
        </div>
      </div>
    </header>
  );
};

