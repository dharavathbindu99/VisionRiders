import React, { useRef, useEffect, useState } from 'react';
import { Detection } from '../types';
import { Download, Eye, EyeOff, Layers, Maximize2 } from 'lucide-react';

interface DetectionCanvasProps {
  imageSrc?: string;
  detections: Detection[];
  selectedDetectionId?: string | number | null;
  onSelectDetection?: (id: string | number | null) => void;
  showLabels?: boolean;
  showConfidence?: boolean;
  showTrails?: boolean;
  showHUD?: boolean;
  isVideoMode?: boolean;
}

export const DetectionCanvas: React.FC<DetectionCanvasProps> = ({
  imageSrc,
  detections,
  selectedDetectionId,
  onSelectDetection,
  showLabels = true,
  showConfidence = true,
  showTrails = true,
  showHUD = true,
  isVideoMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [toggles, setToggles] = useState({
    labels: showLabels,
    trails: showTrails,
    hud: showHUD,
  });

  // Load natural dimensions when image changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [imageSrc]);

  // Redraw canvas overlay whenever detections or options change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !naturalSize.width || !naturalSize.height) return;

    canvas.width = naturalSize.width;
    canvas.height = naturalSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Autonomous HUD Horizon & Grid if enabled
    if (toggles.hud) {
      const cy = canvas.height * 0.62;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);

      // Horizon line
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.1, cy);
      ctx.lineTo(canvas.width * 0.9, cy);
      ctx.stroke();

      // Vehicle corridor perspective lines
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.25, canvas.height);
      ctx.lineTo(canvas.width * 0.44, cy);
      ctx.moveTo(canvas.width * 0.75, canvas.height);
      ctx.lineTo(canvas.width * 0.56, cy);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // 2. Draw Tracking Trails
    if (toggles.trails) {
      for (const det of detections) {
        if (det.trail && det.trail.length > 1) {
          ctx.strokeStyle = det.color || '#00F0FF';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          const trail = det.trail;
          ctx.moveTo(trail[0][0], trail[0][1]);
          for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i][0], trail[i][1]);
          }
          ctx.stroke();

          // Draw small glow points at trail joints
          for (let i = 0; i < trail.length; i++) {
            const alpha = ((i + 1) / trail.length) * 0.8;
            ctx.fillStyle = det.color ? `${det.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}` : `rgba(0,240,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(trail[i][0], trail[i][1], 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 3. Draw Bounding Boxes and Labels
    for (const det of detections) {
      const [x1, y1, x2, y2] = det.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      const isSelected = selectedDetectionId === det.id || selectedDetectionId === det.track_id;
      const isHovered = hoveredId === det.id || hoveredId === det.track_id;

      // Color scheme based on category or tracking color
      let boxColor = det.color || '#00F0FF';
      if (!det.color) {
        if (det.is_vehicle) boxColor = '#00F0FF'; // Cyan
        else if (det.is_pedestrian) boxColor = '#39FF14'; // Lime Green
        else if (det.class_name.includes('light') || det.class_name.includes('sign')) boxColor = '#FFB800'; // Amber
        else boxColor = '#A855F7'; // Purple
      }

      ctx.save();

      // Semi-transparent box background on hover or selection
      if (isSelected || isHovered) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
        ctx.fillRect(x1, y1, width, height);
      }

      // Box borders with glowing effect
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = isSelected || isHovered ? 3 : 2;
      ctx.shadowColor = boxColor;
      ctx.shadowBlur = isSelected || isHovered ? 12 : 4;

      // Draw bounding box
      ctx.strokeRect(x1, y1, width, height);

      // Cyber corner brackets for AV Perception look
      const bracketLen = Math.min(16, width / 4, height / 4);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#FFFFFF';

      // Top-left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + bracketLen);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + bracketLen, y1);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(x2 - bracketLen, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y1 + bracketLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x1, y2 - bracketLen);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x1 + bracketLen, y2);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x2 - bracketLen, y2);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 - bracketLen);
      ctx.stroke();

      ctx.restore();

      // 4. Draw Label Badge
      if (toggles.labels) {
        // Label text formats requested by prompt:
        // Video: "ID: 1 | car | 96.4%"
        // Image: "car 95.7%"
        let labelText = '';
        if (isVideoMode || det.track_id !== undefined) {
          const idStr = `ID: ${det.track_id || 1}`;
          const confStr = showConfidence ? ` | ${det.confidence.toFixed(1)}%` : '';
          labelText = `${idStr} | ${det.class_name}${confStr}`;
        } else {
          const confStr = showConfidence ? ` ${det.confidence.toFixed(1)}%` : '';
          labelText = `${det.class_name}${confStr}`;
        }

        ctx.font = 'bold 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        const textWidth = ctx.measureText(labelText).width;
        const badgeHeight = 22;
        const badgeWidth = textWidth + 14;

        // Position badge above box, or inside if near top boundary
        let badgeY = y1 - badgeHeight;
        if (badgeY < 4) {
          badgeY = y1 + 4;
        }

        // Badge background
        ctx.fillStyle = isSelected || isHovered ? boxColor : '#0B1120';
        ctx.fillRect(x1, badgeY, badgeWidth, badgeHeight);

        // Badge border
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, badgeY, badgeWidth, badgeHeight);

        // Badge text
        ctx.fillStyle = isSelected || isHovered ? '#000000' : '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, x1 + 7, badgeY + badgeHeight / 2);
      }
    }
  }, [detections, naturalSize, toggles, selectedDetectionId, hoveredId, isVideoMode, showConfidence]);

  // Handle clicking on bounding box
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSelectDetection) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = naturalSize.width / rect.width;
    const scaleY = naturalSize.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Find clicked detection
    const clicked = detections.find((d) => {
      const [x1, y1, x2, y2] = d.bbox;
      return clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2;
    });

    onSelectDetection(clicked ? clicked.id || clicked.track_id || null : null);
  };

  // Download annotated image as PNG
  const handleDownloadAnnotated = () => {
    if (!imageSrc || !canvasRef.current) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = naturalSize.width;
    exportCanvas.height = naturalSize.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = imageSrc;
    baseImg.onload = () => {
      ctx.drawImage(baseImg, 0, 0);
      if (canvasRef.current) {
        ctx.drawImage(canvasRef.current, 0, 0);
      }
      const dataUrl = exportCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `visionriders_annotated_${Date.now()}.png`;
      a.click();
    };
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col group">
      {/* Canvas Controls Header Bar */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px]">
            {naturalSize.width ? `${naturalSize.width} × ${naturalSize.height} px` : 'Awaiting Frame'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-cyan-400">{detections.length} Detected Targets</span>
        </div>

        {/* Display Toggles */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setToggles((prev) => ({ ...prev, labels: !prev.labels }))}
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center space-x-1 border cursor-pointer ${
              toggles.labels
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Labels"
          >
            {toggles.labels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>Labels</span>
          </button>

          {isVideoMode && (
            <button
              onClick={() => setToggles((prev) => ({ ...prev, trails: !prev.trails }))}
              className={`px-2 py-1 rounded text-[11px] font-mono border cursor-pointer ${
                toggles.trails
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle Motion Trails"
            >
              Trails
            </button>
          )}

          <button
            onClick={() => setToggles((prev) => ({ ...prev, hud: !prev.hud }))}
            className={`px-2 py-1 rounded text-[11px] font-mono border cursor-pointer ${
              toggles.hud
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle HUD Telemetry"
          >
            HUD
          </button>

          {imageSrc && (
            <button
              onClick={handleDownloadAnnotated}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-400/40 text-[11px] font-medium flex items-center space-x-1 transition cursor-pointer"
              title="Download Annotated Image"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Canvas Stage */}
      <div ref={containerRef} className="relative w-full overflow-hidden flex items-center justify-center min-h-[380px] bg-slate-950">
        {imageSrc ? (
          <div className="relative max-w-full">
            <img
              src={imageSrc}
              alt="Analyzed Frame"
              className="block max-h-[650px] w-auto max-w-full object-contain mx-auto select-none"
            />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="absolute inset-0 w-full h-full cursor-crosshair"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3 font-mono text-xs">
            <Maximize2 className="w-10 h-10 text-slate-700 stroke-[1.5]" />
            <span>NO MEDIA LOADED</span>
            <span className="text-[11px] text-slate-600">Upload road imagery or select a demo sample</span>
          </div>
        )}
      </div>
    </div>
  );
};

