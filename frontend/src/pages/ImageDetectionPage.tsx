import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Sliders,
  Download,
  AlertCircle,
  Clock,
  Car,
  Users,
  Target,
  RefreshCw,
  CheckCircle2,
  BookmarkPlus,
  Eye,
} from 'lucide-react';
import { DetectionCanvas } from '../components/DetectionCanvas';
import { SampleSelector } from '../components/SampleSelector';
import { SampleMedia } from '../services/demoData';
import { api } from '../services/api';
import { Detection, ImageDetectionResponse, HistoryItem } from '../types';
import { historyStorage } from '../services/historyStorage';

interface ImageDetectionPageProps {
  initialSample?: SampleMedia | null;
  onClearInitialSample?: () => void;
  onSaveToHistory?: (item: HistoryItem) => void;
}

export const ImageDetectionPage: React.FC<ImageDetectionPageProps> = ({
  initialSample,
  onClearInitialSample,
  onSaveToHistory,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [confThreshold, setConfThreshold] = useState<number>(0.35);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<ImageDetectionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | number | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'vehicles' | 'pedestrians' | 'traffic'>('all');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically load initial sample if provided via navigation
  useEffect(() => {
    if (initialSample && initialSample.type === 'image') {
      loadSample(initialSample);
      if (onClearInitialSample) onClearInitialSample();
    }
  }, [initialSample]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setImageFile(file);
    setResult(null);
    setErrorMessage('');
    setIsSaved(false);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    runDetection(file, objectUrl, confThreshold);
  };

  const loadSample = async (sample: SampleMedia) => {
    try {
      setIsProcessing(true);
      setErrorMessage('');
      setResult(null);
      setIsSaved(false);

      const res = await fetch(sample.url);
      const blob = await res.blob();
      const file = new File([blob], `${sample.id}.jpg`, { type: 'image/jpeg' });
      setImageFile(file);
      const objectUrl = URL.createObjectURL(blob);
      setImagePreview(objectUrl);
      await runDetection(file, objectUrl, confThreshold);
    } catch (err: any) {
      setErrorMessage(`Failed to load benchmark sample: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const runDetection = async (file: File | Blob, previewUrl: string, conf: number) => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const response = await api.detectImage(file, conf);
      setResult(response);

      // Save to detection history automatically
      const historyItem = historyStorage.add({
        media_type: 'image',
        filename: file instanceof File ? file.name : 'benchmark_sample.jpg',
        thumbnail: previewUrl,
        total_objects: response.summary.total_objects,
        total_vehicles: response.summary.total_vehicles,
        total_pedestrians: response.summary.total_pedestrians,
        avg_confidence: response.summary.avg_confidence,
        inference_time_ms: response.inference_time_ms,
        model_used: response.model_name,
        detections: response.detections,
      });

      if (onSaveToHistory) {
        onSaveToHistory(historyItem);
      }
      setIsSaved(true);
    } catch (err: any) {
      console.error('Detection failed:', err);
      setErrorMessage(
        err.message || 'Detection failed. Please check network connection or try lowering the confidence threshold.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-run detection when confidence slider updates
  const handleConfidenceChange = (newConf: number) => {
    setConfThreshold(newConf);
    if (imageFile && imagePreview) {
      runDetection(imageFile, imagePreview, newConf);
    }
  };

  // Filter detections based on category pill
  const filteredDetections = (result?.detections || []).filter((d) => {
    if (filterCategory === 'vehicles') return d.is_vehicle;
    if (filterCategory === 'pedestrians') return d.is_pedestrian;
    if (filterCategory === 'traffic') return d.class_name.includes('light') || d.class_name.includes('sign');
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
              <Upload className="w-5 h-5" />
            </span>
            Image Object Detection & Road Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detect vehicles, pedestrians, cyclists, and traffic elements with millimeter bounding boxes and model confidence.
          </p>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="flex items-center space-x-3 bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-800">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[11px] font-mono mb-1">
              <span className="text-slate-400">Confidence Threshold:</span>
              <span className="text-cyan-300 font-bold ml-2">{Math.round(confThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={confThreshold}
              onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
              className="w-36 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Benchmark Samples Selector */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800">
        <SampleSelector type="image" onSelect={loadSample} />
      </div>

      {/* Main Detection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Canvas & Upload Area */}
        <div className="lg:col-span-2 space-y-4">
          {imagePreview ? (
            <div className="space-y-3">
              <DetectionCanvas
                imageSrc={result?.annotated_image_base64 || imagePreview}
                detections={filteredDetections}
                selectedDetectionId={selectedDetectionId}
                onSelectDetection={setSelectedDetectionId}
                isVideoMode={false}
                showHUD={true}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-medium transition cursor-pointer"
                >
                  Upload Another Image
                </button>
                {isProcessing && (
                  <span className="flex items-center space-x-2 text-cyan-400 font-mono animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Perception Neural Inference Running...</span>
                  </span>
                )}
                {isSaved && (
                  <span className="flex items-center space-x-1.5 text-emerald-400 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved to Detection History</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Drag and drop upload zone */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/70 rounded-2xl p-12 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-900/40 flex flex-col items-center justify-center space-y-4 min-h-[380px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Drag & Drop Road Image Here</h3>
                <p className="text-xs text-slate-400">Supports high-res JPG, PNG, WEBP autonomous driving frames</p>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-semibold"
              >
                Browse Computer Files
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right Col: Perception Telemetry & Detections List */}
        <div className="space-y-4">
          {/* Summary Metric Stats Card */}
          <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
            <h3 className="font-bold text-white text-sm flex items-center justify-between">
              <span>Perception Summary</span>
              {result && (
                <span className="text-[10px] text-cyan-400 font-normal">
                  {result.model_name}
                </span>
              )}
            </h3>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">TOTAL OBJECTS</span>
                <span className="text-xl font-extrabold text-cyan-300">
                  {result ? result.summary.total_objects : 0}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">INFERENCE LATENCY</span>
                <span className="text-xl font-extrabold text-blue-300">
                  {result ? `${result.inference_time_ms}ms` : '--'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">VEHICLES</span>
                <span className="text-xl font-extrabold text-emerald-300">
                  {result ? result.summary.total_vehicles : 0}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">PEDESTRIANS</span>
                <span className="text-xl font-extrabold text-amber-300">
                  {result ? result.summary.total_pedestrians : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Detections List Table */}
          <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Detected Targets</h3>
              {/* Category Filter Pills */}
              <div className="flex space-x-1 text-[10px] font-mono">
                {(['all', 'vehicles', 'pedestrians'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2 py-0.5 rounded capitalize cursor-pointer ${
                      filterCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredDetections.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                {result
                  ? 'No objects match the current confidence or filter.'
                  : 'Awaiting image analysis...'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                {filteredDetections.map((det) => {
                  const isSelected = selectedDetectionId === det.id;
                  return (
                    <div
                      key={det.id}
                      onClick={() => setSelectedDetectionId(det.id || null)}
                      className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            det.is_vehicle
                              ? 'bg-cyan-400'
                              : det.is_pedestrian
                              ? 'bg-emerald-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="capitalize font-semibold">{det.class_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-cyan-300 font-bold">{det.confidence}%</span>
                        <span className="text-[10px] text-slate-500">
                          [{det.bbox.slice(0, 2).join(',')}]
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

