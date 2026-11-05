import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';
import { api, BackendHealth } from '../services/api';

interface SettingsPageProps {
  backendHealth: BackendHealth;
  onRefreshHealth: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  backendHealth,
  onRefreshHealth,
}) => {
  const [backendUrl, setBackendUrl] = useState<string>(api.getBackendUrl());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [defaultConf, setDefaultConf] = useState<number>(0.35);
  const [defaultIou, setDefaultIou] = useState<number>(0.45);
  const [showHUD, setShowHUD] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [enginePreference, setEnginePreference] = useState<'auto' | 'fastapi' | 'tfjs'>('auto');

  const handleSaveBackendUrl = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const health = await api.setBackendUrl(backendUrl);
      if (health.status === 'online') {
        setTestResult('Connected successfully! Model: ' + (health.model_loaded || 'YOLOv8'));
      } else {
        setTestResult('Server unreachable. Using browser TensorFlow.js fallback.');
      }
      onRefreshHealth();
    } catch {
      setTestResult('Connection failed. Using browser TensorFlow.js fallback.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetDefaults = () => {
    setDefaultConf(0.35);
    setDefaultIou(0.45);
    setShowHUD(true);
    setShowTrails(true);
    setEnginePreference('auto');
    setBackendUrl('http://localhost:8000');
    api.setBackendUrl('http://localhost:8000');
    setTestResult('Settings reset to system factory defaults.');
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-200">
      {/* Page Title */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
            <SettingsIcon className="w-5 h-5" />
          </span>
          System Settings &amp; Perception Engine Config
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure model inference thresholds, FastAPI endpoint connection, and HUD overlays.
        </p>
      </div>

      {/* Backend API Configuration */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          FastAPI Perception Backend Connection
        </h3>

        <div className="space-y-3">
          <label className="text-xs text-slate-400 block font-mono">
            FastAPI Server Endpoint URL:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleSaveBackendUrl}
              disabled={isTesting}
              className="px-5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-semibold text-xs flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
            >
              {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Test &amp; Save Connection</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs font-mono flex items-center space-x-2 ${
                backendHealth.status === 'online'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
              }`}
            >
              {backendHealth.status === 'online' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{testResult}</span>
            </div>
          )}
        </div>
      </div>

      {/* Model Inference Thresholds */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          Default Detection &amp; Filtering Thresholds
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-slate-300">Default Confidence Cutoff:</span>
              <span className="text-cyan-400 font-bold">{Math.round(defaultConf * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={defaultConf}
              onChange={(e) => setDefaultConf(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Detections with confidence below this value will be pruned to eliminate false positives.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-slate-300">Non-Maximum Suppression (IoU) Threshold:</span>
              <span className="text-cyan-400 font-bold">{Math.round(defaultIou * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.80"
              step="0.05"
              value={defaultIou}
              onChange={(e) => setDefaultIou(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Intersection over Union threshold used by NMS to eliminate overlapping duplicate boxes.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Display Toggles */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          Autonomous HUD &amp; Perception Overlay Preferences
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900/90 transition">
            <span className="text-slate-300">Render Horizon &amp; Vehicle Corridor Perspective Lines</span>
            <input
              type="checkbox"
              checked={showHUD}
              onChange={(e) => setShowHUD(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900/90 transition">
            <span className="text-slate-300">Render Dynamic Motion Trails for Moving Road Objects</span>
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Reset Defaults */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleResetDefaults}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
        >
          Reset to System Factory Defaults
        </button>
      </div>
    </div>
  );
};

