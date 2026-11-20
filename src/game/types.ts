export type GamePhase = 'menu' | 'running' | 'paused' | 'finished';

export type SurfaceType = 'gravel' | 'tarmac' | 'snow' | 'forest';

export type CheckpointTaskType =
  | 'molecular-recognition'
  | 'three-garages'
  | 'geminal-vicinal'
  | 'chirality'
  | 'synthesis-routes'
  | 'boiling-points'
  | 'vicinal-hydrolysis'
  | 'geminal-hydrolyses'
  | 'amine-alkylation'
  | 'grignard-reagent'
  | 'zaitsev-elimination'
  | 'elimination-dead-end'
  | 'uses-past-present'
  | 'reaction-chain-butene'
  | 'stoichiometry-service'
  | 'championship-planner';

export interface StageCheckpoint {
  id: string;
  progress: number;
  label: string;
  taskType: CheckpointTaskType;
  lessonId?: string;
}

export interface StagePalette {
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  sunColor: string;
  sunIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  roadColor: string;
  shoulderColor: string;
  grassColor: string;
  rockColor: string;
  foliageColors: [string, string, string];
}

export interface StageConfig {
  id: string;
  stageNumber: number;
  name: string;
  subtitle: string;
  description?: string;
  surface: SurfaceType;
  surfaceLabel: string;
  roadHalfWidth: number;
  shoulderWidth: number;
  controlPoints: Array<[number, number, number]>;
  palette: StagePalette;
  /** Extensible hook for Phase 2 chemistry checkpoints */
  checkpoints: StageCheckpoint[];
}

export type SurfaceZone = 'road' | 'shoulder' | 'offroad';

export interface VehicleInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1 (right) .. +1 (left)
}

export interface VehicleState {
  x: number;
  y: number;
  z: number;
  heading: number; // radians, 0 = +Z, +PI/2 = +X (left)
  vx: number;
  vz: number;
  speed: number; // signed forward speed in m/s
  steeringAngle: number; // front wheel angle in radians
  wheelSpin: number; // cumulative wheel rotation in radians
  bodyPitch: number; // visual pitch in radians
  bodyRoll: number; // visual roll in radians
  terrainPitch: number; // road slope along forward axis
  terrainRoll: number; // road slope along lateral axis
  surfaceZone: SurfaceZone;
  isOffRoad: boolean;
  isDrifting: boolean;
  lateralSlip: number;
  distanceTraveled: number; // cumulative meters driven along stage
  trackProgress: number; // 0..1 along centerline
  closestTrackDistance: number; // meters from start along spline
  lateralOffset: number; // signed distance from road center
  lastSafeX: number;
  lastSafeY: number;
  lastSafeZ: number;
  lastSafeHeading: number;
  lastSafeTrackDistance: number;
  stuckSeconds: number;
  isStuck: boolean;
  collisionCooldown: number;
  lastColliderIndex: number;
  finished: boolean;
}

export interface TelemetrySnapshot {
  speedKmh: number;
  gear: string;
  elapsedSeconds: number;
  drivingPenaltySeconds: number;
  distanceMeters: number;
  totalDistanceMeters: number;
  progress: number;
  surfaceZone: SurfaceZone;
  isOffRoad: boolean;
  isDrifting: boolean;
  isStuck: boolean;
  headingDeg: number;
  finished: boolean;
  checkpointsCompleted: number;
  totalCheckpoints: number;
}
