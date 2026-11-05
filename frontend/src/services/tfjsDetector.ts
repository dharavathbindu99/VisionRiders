import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { Detection, DetectionSummary } from '../types';

export class TFJSDetectorService {
  private static instance: TFJSDetectorService;
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading = false;
  private loadPromise: Promise<cocoSsd.ObjectDetection> | null = null;

  public static getInstance(): TFJSDetectorService {
    if (!TFJSDetectorService.instance) {
      TFJSDetectorService.instance = new TFJSDetectorService();
    }
    return TFJSDetectorService.instance;
  }

  public async loadModel(): Promise<cocoSsd.ObjectDetection> {
    if (this.model) return this.model;
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        await tf.ready();
        // Load COCO-SSD with mobilenet_v2 for best balance of speed & accuracy
        const loaded = await cocoSsd.load({ base: 'mobilenet_v2' });
        this.model = loaded;
        this.isLoading = false;
        return loaded;
      } catch (err) {
        this.isLoading = false;
        this.loadPromise = null;
        console.error('Failed to load TFJS COCO-SSD model:', err);
        throw err;
      }
    })();

    return this.loadPromise;
  }

  public isLoaded(): boolean {
    return this.model !== null;
  }

  public isModelLoading(): boolean {
    return this.isLoading;
  }

  public async detect(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    confThreshold: number = 0.35
  ): Promise<{ detections: Detection[]; inference_time_ms: number; summary: DetectionSummary }> {
    const model = await this.loadModel();
    const startTime = performance.now();

    // cocoSsd.detect returns Array of { bbox: [x, y, width, height], class: string, score: number }
    const rawPredictions = await model.detect(imageElement, 25, confThreshold);
    const inferenceTime = Math.round(performance.now() - startTime);

    const vehicleClasses = new Set(['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train']);
    const pedestrianClasses = new Set(['person']);
    const trafficClasses = new Set(['traffic light', 'stop sign', 'parking meter', 'fire hydrant']);

    let totalVehicles = 0;
    let totalPedestrians = 0;
    let totalTraffic = 0;
    let confSum = 0;
    const classesBreakdown: Record<string, number> = {};

    const detections: Detection[] = rawPredictions
      .filter((p) => p.score >= confThreshold)
      .map((p, idx) => {
        const [x, y, width, height] = p.bbox;
        // Convert [x, y, w, h] to [x1, y1, x2, y2]
        const bbox: [number, number, number, number] = [
          Math.round(x),
          Math.round(y),
          Math.round(x + width),
          Math.round(y + height),
        ];

        const className = p.class.toLowerCase();
        const isVehicle = vehicleClasses.has(className);
        const isPedestrian = pedestrianClasses.has(className);
        const isTraffic = trafficClasses.has(className);

        if (isVehicle) totalVehicles++;
        if (isPedestrian) totalPedestrians++;
        if (isTraffic) totalTraffic++;
        confSum += p.score;
        classesBreakdown[className] = (classesBreakdown[className] || 0) + 1;

        return {
          id: `tfjs-${idx}-${Date.now()}`,
          class_name: className,
          confidence: Number((p.score * 100).toFixed(1)),
          bbox,
          is_vehicle: isVehicle,
          is_pedestrian: isPedestrian,
        };
      });

    const totalObjects = detections.length;
    const avgConfidence = totalObjects > 0 ? Number((confSum / totalObjects * 100).toFixed(1)) : 0;

    const summary: DetectionSummary = {
      total_objects: totalObjects,
      total_vehicles: totalVehicles,
      total_pedestrians: totalPedestrians,
      total_traffic_elements: totalTraffic,
      avg_confidence: avgConfidence,
      classes_breakdown: classesBreakdown,
    };

    return {
      detections,
      inference_time_ms: inferenceTime,
      summary,
    };
  }
}

export const tfjsDetector = TFJSDetectorService.getInstance();

