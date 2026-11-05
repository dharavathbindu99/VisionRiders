export interface SampleMedia {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  url: string;
  expectedVehicles: number;
  expectedPedestrians: number;
}

export const SAMPLE_ROAD_IMAGES: SampleMedia[] = [
  {
    id: 'sample-local-road',
    title: 'Offline Perception Benchmark',
    description: 'Autonomous road scene with sedans, lane markings, pedestrians, and traffic signals.',
    type: 'image',
    url: '/samples/demo_road.jpg',
    expectedVehicles: 2,
    expectedPedestrians: 1,
  },
  {
    id: 'sample-urban-crossing',
    title: 'Urban Intersection & Pedestrians',
    description: 'Busy downtown crossing with multiple sedans, SUVs, cyclists, and crossing pedestrians.',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=1200&auto=format&fit=crop',
    expectedVehicles: 4,
    expectedPedestrians: 3,
  },
  {
    id: 'sample-highway-cruise',
    title: 'Multi-Lane Highway Traffic',
    description: 'Daytime highway with flowing traffic, freight trucks, passenger cars, and overhead gantry.',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1200&auto=format&fit=crop',
    expectedVehicles: 6,
    expectedPedestrians: 0,
  },
  {
    id: 'sample-night-city',
    title: 'Night Driving & Street Lights',
    description: 'Low-light urban road with headlights, traffic lights, and crosswalk pedestrian silhouettes.',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1200&auto=format&fit=crop',
    expectedVehicles: 5,
    expectedPedestrians: 2,
  },
];

export const SAMPLE_ROAD_VIDEOS: SampleMedia[] = [
  {
    id: 'sample-local-video',
    title: 'Local Test Drive Stream',
    description: 'High-speed synthetic perception tracking benchmark with moving vehicles and pedestrian trajectory.',
    type: 'video',
    url: '/samples/test_drive.mp4',
    expectedVehicles: 2,
    expectedPedestrians: 1,
  },
  {
    id: 'sample-vid-dashcam-1',
    title: 'Autonomous Dashcam Test Reel',
    description: 'Front-facing autonomous perception test recording navigating suburban road traffic.',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    expectedVehicles: 8,
    expectedPedestrians: 2,
  },
  {
    id: 'sample-vid-highway',
    title: 'Highway Fast-Lane Stream',
    description: 'Dual-carriageway vehicle tracking benchmark with dynamic overtaking maneuvers.',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    expectedVehicles: 12,
    expectedPedestrians: 0,
  },
];
