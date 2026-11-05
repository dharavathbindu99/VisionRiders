import React from 'react';
import { SAMPLE_ROAD_IMAGES, SAMPLE_ROAD_VIDEOS, SampleMedia } from '../services/demoData';
import { Car, Play, Image as ImageIcon } from 'lucide-react';

interface SampleSelectorProps {
  type: 'image' | 'video';
  onSelect: (sample: SampleMedia) => void;
  selectedId?: string;
}

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  type,
  onSelect,
  selectedId,
}) => {
  const items = type === 'image' ? SAMPLE_ROAD_IMAGES : SAMPLE_ROAD_VIDEOS;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          {type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
          Autonomous Driving Benchmark Samples
        </span>
        <span className="text-slate-400 text-[11px] font-mono">1-Click Test</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((sample) => {
          const isSelected = selectedId === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => onSelect(sample)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-semibold text-white truncate">{sample.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                    {sample.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Car className="w-3 h-3 text-cyan-400" />
                  <span>~{sample.expectedVehicles} veh</span>
                </span>
                <span className="text-cyan-400 font-medium">Load Preset &rarr;</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

