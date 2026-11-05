import React, { useState } from 'react';
import {
  History as HistoryIcon,
  Trash2,
  Calendar,
  Layers,
  Car,
  Users,
  Search,
  ExternalLink,
  Download,
} from 'lucide-react';
import { HistoryItem } from '../types';
import { historyStorage } from '../services/historyStorage';

interface HistoryPageProps {
  history: HistoryItem[];
  onRefreshHistory: () => void;
  onSelectHistoryItem?: (item: HistoryItem) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onRefreshHistory,
  onSelectHistoryItem,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'live'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalItem, setActiveModalItem] = useState<HistoryItem | null>(null);

  const filteredItems = history.filter((item) => {
    if (filterType !== 'all' && item.media_type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.filename.toLowerCase().includes(q);
      const matchModel = item.model_used.toLowerCase().includes(q);
      const matchDets = item.detections?.some((d) => d.class_name.toLowerCase().includes(q));
      return matchName || matchModel || matchDets;
    }
    return true;
  });

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all detection history?')) {
      historyStorage.clear();
      onRefreshHistory();
    }
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    historyStorage.delete(id);
    onRefreshHistory();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
              <HistoryIcon className="w-5 h-5" />
            </span>
            Perception History & Detection Archive
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical log of road imagery, tracked videos, confidence benchmarks, and target breakdowns.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Archive</span>
          </button>
        )}
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel rounded-xl p-3 border border-slate-800 text-xs">
        {/* Media type filter buttons */}
        <div className="flex items-center space-x-1 w-full sm:w-auto font-mono">
          {(['all', 'image', 'video', 'live'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                filterType === type
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {type} ({history.filter((h) => type === 'all' || h.media_type === type).length})
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search class, filename, model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
          />
        </div>
      </div>

      {/* History Grid */}
      {filteredItems.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3 font-mono text-xs text-slate-500">
          <HistoryIcon className="w-10 h-10 mx-auto text-slate-700 stroke-[1.5]" />
          <span>NO MATCHING DETECTION RUNS FOUND</span>
          <p className="text-[11px] text-slate-600">
            Run an image detection or video tracking workflow to record telemetry entries.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveModalItem(item)}
              className="glass-panel rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              {/* Thumbnail / Header */}
              <div className="relative h-44 bg-slate-950 flex items-center justify-center overflow-hidden">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 font-mono text-xs space-y-1">
                    <Layers className="w-8 h-8 text-slate-700" />
                    <span>{item.media_type.toUpperCase()} ARCHIVE</span>
                  </div>
                )}

                {/* Media type badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md border border-slate-700 text-cyan-300 text-[10px] font-mono uppercase">
                  {item.media_type}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteItem(item.id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                  title="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <span className="text-cyan-400 font-semibold">{item.model_used}</span>
                </div>

                <h4 className="font-semibold text-white truncate text-sm" title={item.filename}>
                  {item.filename}
                </h4>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800/80">
                  <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">TARGETS</span>
                    <span className="font-bold text-white">{item.total_objects}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">VEHICLES</span>
                    <span className="font-bold text-cyan-400">{item.total_vehicles}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">AVG CONF</span>
                    <span className="font-bold text-amber-400">{item.avg_confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel-glow rounded-2xl max-w-2xl w-full border border-cyan-500/40 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span className="text-cyan-400 uppercase text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30">
                  {activeModalItem.media_type}
                </span>
                <span>{activeModalItem.filename}</span>
              </h3>
              <button
                onClick={() => setActiveModalItem(null)}
                className="text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
              >
                &times; Close
              </button>
            </div>

            {activeModalItem.thumbnail && (
              <div className="rounded-xl overflow-hidden max-h-[300px] flex items-center justify-center bg-black">
                <img
                  src={activeModalItem.thumbnail}
                  alt={activeModalItem.filename}
                  className="max-h-[300px] w-auto object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">TOTAL OBJECTS</span>
                <span className="text-lg font-bold text-cyan-400">{activeModalItem.total_objects}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">VEHICLES</span>
                <span className="text-lg font-bold text-blue-400">{activeModalItem.total_vehicles}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">PEDESTRIANS</span>
                <span className="text-lg font-bold text-emerald-400">{activeModalItem.total_pedestrians}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">CONFIDENCE</span>
                <span className="text-lg font-bold text-amber-400">{activeModalItem.avg_confidence}%</span>
              </div>
            </div>

            {activeModalItem.detections && activeModalItem.detections.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-300">Classified Target List</h4>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                  {activeModalItem.detections.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800"
                    >
                      <span className="capitalize text-white font-medium">{d.class_name}</span>
                      <span className="text-cyan-400 font-bold">{d.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

