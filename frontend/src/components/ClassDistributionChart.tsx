import React from 'react';

interface ClassDistributionChartProps {
  data: Record<string, number>;
  totalObjects: number;
}

const CLASS_COLORS: Record<string, string> = {
  car: '#00F0FF',
  truck: '#0ea5e9',
  bus: '#38bdf8',
  motorcycle: '#06b6d4',
  bicycle: '#22d3ee',
  person: '#39FF14',
  'traffic light': '#f59e0b',
  'stop sign': '#ef4444',
  other: '#a855f7',
};

export const ClassDistributionChart: React.FC<ClassDistributionChartProps> = ({
  data,
  totalObjects,
}) => {
  const entries = Object.entries(data);

  if (entries.length === 0 || totalObjects === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 font-mono text-xs">
        <span>NO TARGETS CLASSIFIED YET</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Visual horizontal stacked bar */}
      <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
        {entries.map(([cls, count]) => {
          const pct = Math.max(2, (count / totalObjects) * 100);
          const color = CLASS_COLORS[cls] || CLASS_COLORS.other;
          return (
            <div
              key={cls}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${cls}: ${count} (${((count / totalObjects) * 100).toFixed(1)}%)`}
              className="h-full transition-all duration-500 hover:brightness-125"
            />
          );
        })}
      </div>

      {/* Breakdown chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
        {entries.map(([cls, count]) => {
          const color = CLASS_COLORS[cls] || CLASS_COLORS.other;
          const pct = ((count / totalObjects) * 100).toFixed(1);
          return (
            <div
              key={cls}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono"
            >
              <div className="flex items-center space-x-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-300 capitalize truncate">{cls}</span>
              </div>
              <div className="flex items-center space-x-1.5 ml-2">
                <span className="font-bold text-white">{count}</span>
                <span className="text-[10px] text-slate-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

