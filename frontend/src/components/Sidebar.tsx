import React from 'react';
import {
  LayoutDashboard,
  Scan,
  Compass,
  Video,
  History,
  Info,
  Settings,
  ShieldCheck,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { BackendHealth } from '../services/api';

export type NavTab =
  | 'dashboard'
  | 'detection'
  | 'tracking'
  | 'live'
  | 'history'
  | 'about'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  backendHealth: BackendHealth;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  backendHealth,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'detection', label: 'Object Detection', icon: <Scan className="w-5 h-5" /> },
    { id: 'tracking', label: 'Object Tracking', icon: <Video className="w-5 h-5" />, badge: 'ByteTrack' },
    { id: 'live', label: 'Live Analysis', icon: <Compass className="w-5 h-5" />, badge: 'Webcam' },
    { id: 'history', label: 'Detection History', icon: <History className="w-5 h-5" /> },
    { id: 'about', label: 'About Project', icon: <Info className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-[#0a101f]/90 border-r border-cyan-500/20 flex flex-col justify-between shrink-0 h-screen sticky top-0 backdrop-blur-xl z-30 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-cyan-500/20 flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-lg tracking-wider text-white">VISION</span>
              <span className="font-light text-lg tracking-wider text-cyan-400">RIDERS</span>
            </div>
            <p className="text-[10px] text-cyan-300/70 tracking-widest uppercase font-mono">AV Perception Lab</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            Perception Modules
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`${isActive ? 'text-cyan-400' : 'text-gray-400'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                        : 'bg-slate-800 text-gray-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Backend Status Widget */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-gray-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Core Engine</span>
          </div>
          {backendHealth.status === 'online' ? (
            <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
              <Wifi className="w-2.5 h-2.5" />
              <span>YOLO Online</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-[11px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
              <WifiOff className="w-2.5 h-2.5" />
              <span>TF.js Active</span>
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          {backendHealth.status === 'online'
            ? `Ultralytics ${backendHealth.model_loaded || 'YOLOv8'} on ${backendHealth.device || 'CPU'}`
            : 'Browser COCO-SSD neural engine active & ready'}
        </p>
      </div>
    </aside>
  );
};

