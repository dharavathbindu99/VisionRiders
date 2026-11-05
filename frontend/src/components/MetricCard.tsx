import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  isPositive?: boolean;
  accentColor?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'purple';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  isPositive = true,
  accentColor = 'cyan',
}) => {
  const colorMap = {
    cyan: {
      border: 'hover:border-cyan-500/50',
      iconBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-400/30',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.1)]',
      valueColor: 'text-cyan-300',
    },
    blue: {
      border: 'hover:border-blue-500/50',
      iconBg: 'bg-blue-500/15 text-blue-400 border-blue-400/30',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      valueColor: 'text-blue-300',
    },
    emerald: {
      border: 'hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      valueColor: 'text-emerald-300',
    },
    amber: {
      border: 'hover:border-amber-500/50',
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-400/30',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
      valueColor: 'text-amber-300',
    },
    purple: {
      border: 'hover:border-purple-500/50',
      iconBg: 'bg-purple-500/15 text-purple-400 border-purple-400/30',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]',
      valueColor: 'text-purple-300',
    },
  };

  const scheme = colorMap[accentColor];

  return (
    <div
      className={`glass-panel rounded-xl p-5 border border-slate-800/80 transition-all duration-300 relative overflow-hidden group ${scheme.border} ${scheme.glow}`}
    >
      {/* Top telemetry corner */}
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-lg border ${scheme.iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline space-x-2">
        <span className={`text-3xl font-extrabold font-mono tracking-tight ${scheme.valueColor}`}>
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${
              isPositive
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-400 mt-2 font-mono truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};

