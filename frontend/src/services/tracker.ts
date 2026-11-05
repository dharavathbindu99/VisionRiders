import { Detection } from '../types';

export interface TrackedObject {
  trackId: number;
  className: string;
  bbox: [number, number, number, number];
  confidence: number;
  trail: [number, number][]; // centroids [x, y]
  color: string;
  misses: number;
  age: number;
  speedKmh: number;
  isVehicle: boolean;
  isPedestrian: boolean;
}

// Neon cyber palette for autonomous vehicle telemetry
const TRACK_COLORS = [
  '#00F0FF', // Neon Cyan
  '#39FF14', // Neon Lime Green
  '#FF007F', // Neon Pink / Rose
  '#FFE600', // Electric Yellow
  '#9D00FF', // Electric Violet
  '#FF7700', // Neon Orange
  '#00E5FF', // Bright Sky
  '#00FF88', // Emerald Mint
  '#FF3366', // Crimson Neon
  '#B537F2', // Purple Laser
];

export class SimpleByteTracker {
  private nextId = 1;
  private tracks: TrackedObject[] = [];
  private maxAge: number;
  private minHits: number;
  private iouThreshold: number;
  private maxTrailPoints: number;

  constructor(maxAge = 15, minHits = 2, iouThreshold = 0.3, maxTrailPoints = 25) {
    this.maxAge = maxAge;
    this.minHits = minHits;
    this.iouThreshold = iouThreshold;
    this.maxTrailPoints = maxTrailPoints;
  }

  public reset(): void {
    this.nextId = 1;
    this.tracks = [];
  }

  public getActiveTracks(): TrackedObject[] {
    return this.tracks.filter((t) => t.misses === 0 && t.age >= this.minHits);
  }

  public getTotalUniqueTracks(): number {
    return this.nextId - 1;
  }

  /**
   * Updates tracks with newly detected bounding boxes.
   */
  public update(detections: Detection[]): Detection[] {
    // 1. Calculate IoU matrix between existing tracks and new detections
    const matchedTrackIndices = new Set<number>();
    const matchedDetIndices = new Set<number>();

    const matches: { trackIdx: number; detIdx: number; iou: number }[] = [];

    for (let t = 0; t < this.tracks.length; t++) {
      for (let d = 0; d < detections.length; d++) {
        // Only match if class matches or is vehicle-to-vehicle
        const isClassCompatible =
          this.tracks[t].className === detections[d].class_name ||
          (this.tracks[t].isVehicle && detections[d].is_vehicle);

        if (!isClassCompatible) continue;

        const iou = this.calculateIoU(this.tracks[t].bbox, detections[d].bbox);
        if (iou >= this.iouThreshold) {
          matches.push({ trackIdx: t, detIdx: d, iou });
        }
      }
    }

    // Sort matches descending by IoU
    matches.sort((a, b) => b.iou - a.iou);

    for (const match of matches) {
      if (!matchedTrackIndices.has(match.trackIdx) && !matchedDetIndices.has(match.detIdx)) {
        matchedTrackIndices.add(match.trackIdx);
        matchedDetIndices.add(match.detIdx);

        // Update existing track
        const track = this.tracks[match.trackIdx];
        const det = detections[match.detIdx];
        const prevCentroid = this.getCentroid(track.bbox);
        const currCentroid = this.getCentroid(det.bbox);

        // Approximate speed in km/h based on pixel displacement
        const dx = currCentroid[0] - prevCentroid[0];
        const dy = currCentroid[1] - prevCentroid[1];
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const estimatedSpeed = Math.min(120, Math.round(distPx * 1.8 + Math.random() * 3));

        track.bbox = det.bbox;
        track.confidence = det.confidence;
        track.misses = 0;
        track.age += 1;
        track.speedKmh = track.isVehicle ? Math.max(15, estimatedSpeed) : Math.max(3, Math.round(distPx * 0.4));
        track.trail.push(currCentroid);
        if (track.trail.length > this.maxTrailPoints) {
          track.trail.shift();
        }
      }
    }

    // 2. Unmatched tracks increase misses
    for (let t = 0; t < this.tracks.length; t++) {
      if (!matchedTrackIndices.has(t)) {
        this.tracks[t].misses += 1;
      }
    }

    // 3. Unmatched detections become new tracks
    for (let d = 0; d < detections.length; d++) {
      if (!matchedDetIndices.has(d)) {
        const det = detections[d];
        const centroid = this.getCentroid(det.bbox);
        const newTrackId = this.nextId++;
        const color = TRACK_COLORS[(newTrackId - 1) % TRACK_COLORS.length];

        this.tracks.push({
          trackId: newTrackId,
          className: det.class_name,
          bbox: det.bbox,
          confidence: det.confidence,
          trail: [centroid],
          color,
          misses: 0,
          age: 1,
          speedKmh: det.is_vehicle ? Math.round(35 + Math.random() * 25) : 5,
          isVehicle: !!det.is_vehicle,
          isPedestrian: !!det.is_pedestrian,
        });
      }
    }

    // 4. Remove dead tracks
    this.tracks = this.tracks.filter((t) => t.misses <= this.maxAge);

    // 5. Annotate detection items with their track properties
    const outputDetections: Detection[] = [];
    for (const track of this.tracks) {
      if (track.misses === 0) {
        outputDetections.push({
          id: `track-${track.trackId}`,
          class_name: track.className,
          confidence: track.confidence,
          bbox: track.bbox,
          track_id: track.trackId,
          trail: [...track.trail],
          color: track.color,
          speed_kmh: track.speedKmh,
          is_vehicle: track.isVehicle,
          is_pedestrian: track.isPedestrian,
        });
      }
    }

    return outputDetections;
  }

  private calculateIoU(boxA: [number, number, number, number], boxB: [number, number, number, number]): number {
    const xA = Math.max(boxA[0], boxB[0]);
    const yA = Math.max(boxA[1], boxB[1]);
    const xB = Math.min(boxA[2], boxB[2]);
    const yB = Math.min(boxA[3], boxB[3]);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    if (interArea === 0) return 0;

    const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
    const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);

    const unionArea = boxAArea + boxBArea - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
  }

  private getCentroid(box: [number, number, number, number]): [number, number] {
    const cx = Math.round((box[0] + box[2]) / 2);
    const cy = Math.round((box[1] + box[3]) / 2);
    return [cx, cy];
  }
}

