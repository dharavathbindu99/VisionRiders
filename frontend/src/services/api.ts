import { Detection, DetectionSummary, ImageDetectionResponse } from '../types';
import { tfjsDetector } from './tfjsDetector';

const DEFAULT_BACKEND_URL = 'http://localhost:8000';

export interface BackendHealth {
  status: 'online' | 'offline' | 'checking';
  model_loaded?: string;
  device?: string;
  cuda_available?: boolean;
}

class ApiService {
  private backendUrl: string = DEFAULT_BACKEND_URL;
  private healthStatus: BackendHealth = { status: 'checking' };

  constructor() {
    const saved = localStorage.getItem('visionriders_backend_url');
    if (saved) {
      this.backendUrl = saved;
    }
    this.checkHealth();
  }

  public setBackendUrl(url: string) {
    this.backendUrl = url;
    localStorage.setItem('visionriders_backend_url', url);
    return this.checkHealth();
  }

  public getBackendUrl(): string {
    return this.backendUrl;
  }

  public getHealth(): BackendHealth {
    return this.healthStatus;
  }

  public async checkHealth(): Promise<BackendHealth> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${this.backendUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.healthStatus = {
          status: 'online',
          model_loaded: data.model_loaded || 'YOLOv8n',
          device: data.device || 'CPU',
          cuda_available: data.cuda_available || false,
        };
      } else {
        this.healthStatus = { status: 'offline' };
      }
    } catch {
      this.healthStatus = { status: 'offline' };
    }
    return this.healthStatus;
  }

  /**
   * Detects objects in an image. Uses FastAPI if online, or falls back to TF.js COCO-SSD.
   */
  public async detectImage(
    file: File | Blob,
    confThreshold: number = 0.35,
    forceBrowserMode: boolean = false
  ): Promise<ImageDetectionResponse> {
    // 1. Try FastAPI backend if not forcing browser mode
    if (!forceBrowserMode) {
      const health = await this.checkHealth();
      if (health.status === 'online') {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('confidence', confThreshold.toString());

          const res = await fetch(`${this.backendUrl}/detect/image`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            return {
              detections: data.detections,
              image_width: data.image_width,
              image_height: data.image_height,
              inference_time_ms: data.inference_time_ms,
              annotated_image_base64: data.annotated_image_base64,
              summary: data.summary,
              model_name: data.model_name || 'Ultralytics YOLOv8n',
              source: 'fastapi',
            };
          }
        } catch (backendError) {
          console.warn('FastAPI backend call failed, falling back to TF.js:', backendError);
        }
      }
    }

    // 2. Browser fallback using TensorFlow.js COCO-SSD
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const result = await tfjsDetector.detect(img, confThreshold);
          resolve({
            detections: result.detections,
            image_width: img.naturalWidth || img.width,
            image_height: img.naturalHeight || img.height,
            inference_time_ms: result.inference_time_ms,
            summary: result.summary,
            model_name: 'TensorFlow.js COCO-SSD (Browser Fallback)',
            source: 'tfjs-coco',
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for detection'));

      if (file instanceof Blob) {
        img.src = URL.createObjectURL(file);
      }
    });
  }

  /**
   * Video tracking via FastAPI backend
   */
  public async trackVideoBackend(file: File, confThreshold: number = 0.35) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confidence', confThreshold.toString());

    const res = await fetch(`${this.backendUrl}/track/video`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Video tracking failed: ${errorText || res.statusText}`);
    }

    return await res.json();
  }
}

export const api = new ApiService();

