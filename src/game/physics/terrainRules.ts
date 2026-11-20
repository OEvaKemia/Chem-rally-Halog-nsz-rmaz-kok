import { TrackField } from '../tracks/trackField';
import type { SurfaceZone, VehicleInput, VehicleState } from '../types';

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
}

export interface SurfaceHandlingProfile {
  zone: SurfaceZone;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  enginePower: number;
  rollingDrag: number;
  lateralGrip: number;
  steerResponsiveness: number;
  steerMaxScale: number;
}

export const COLLISION_PENALTY_SECONDS = 5;
export const RECOVERY_PENALTY_SECONDS = 5;
export const STUCK_THRESHOLD_SECONDS = 3.0;
export const MAX_VALLEY_OFFSET_METERS = 18.5;

const ROAD_PROFILE: SurfaceHandlingProfile = {
  zone: 'road',
  maxForwardSpeed: 37.0, // ~133 km/h
  maxReverseSpeed: 10.5,
  enginePower: 23.0,
  rollingDrag: 0.95,
  lateralGrip: 7.8,
  steerResponsiveness: 1.0,
  steerMaxScale: 1.0,
};

const SHOULDER_PROFILE: SurfaceHandlingProfile = {
  zone: 'shoulder',
  maxForwardSpeed: 22.0, // ~79 km/h
  maxReverseSpeed: 9.2,
  enginePower: 17.5,
  rollingDrag: 2.8,
  lateralGrip: 5.5,
  steerResponsiveness: 0.78,
  steerMaxScale: 0.9,
};

const OFFROAD_PROFILE: SurfaceHandlingProfile = {
  zone: 'offroad',
  maxForwardSpeed: 11.5, // ~41 km/h cap, ~36 km/h steady off-road
  maxReverseSpeed: 8.0,
  enginePower: 15.0,
  rollingDrag: 4.2,
  lateralGrip: 3.1,
  steerResponsiveness: 0.85,
  steerMaxScale: 1.05,
};

export function classifySurfaceZone(absLateral: number, track: TrackField): SurfaceZone {
  const roadLimit = track.config.roadHalfWidth + 0.25;
  const shoulderLimit = track.config.roadHalfWidth + track.config.shoulderWidth + 0.6;
  if (absLateral <= roadLimit) return 'road';
  if (absLateral <= shoulderLimit) return 'shoulder';
  return 'offroad';
}

export function getSurfaceHandlingProfile(zone: SurfaceZone): SurfaceHandlingProfile {
  if (zone === 'road') return ROAD_PROFILE;
  if (zone === 'shoulder') return SHOULDER_PROFILE;
  return OFFROAD_PROFILE;
}

export interface CollisionStepResult {
  x: number;
  z: number;
  vx: number;
  vz: number;
  vForward: number;
  collided: boolean;
  penaltyTriggered: boolean;
  lastColliderIndex: number;
  collisionCooldown: number;
}

export function resolveObstacleCollisions(
  startX: number,
  startZ: number,
  startVx: number,
  startVz: number,
  startVForward: number,
  colliders: CircleCollider[],
  prevCooldown: number,
  prevColliderIndex: number,
  dt: number,
): CollisionStepResult {
  let x = startX;
  let z = startZ;
  let vx = startVx;
  let vz = startVz;
  let vForward = startVForward;
  let collided = false;
  let penaltyTriggered = false;
  let collisionCooldown = Math.max(0, prevCooldown - dt);
  let lastColliderIndex = prevColliderIndex;

  const carRadius = 1.38;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const col = colliders[i];
      const dx = x - col.x;
      const dz = z - col.z;
      const minDist = carRadius + col.radius;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDist * minDist) {
        collided = true;
        const dist = distSq > 1e-6 ? Math.sqrt(distSq) : 0.01;
        const nx = distSq > 1e-6 ? dx / dist : 0;
        const nz = distSq > 1e-6 ? dz / dist : 1;
        const overlap = minDist - dist + 0.03;

        x += nx * overlap;
        z += nz * overlap;

        const vn = vx * nx + vz * nz;
        if (vn < 0) {
          const impactSpeed = -vn;
          // Cancel inward velocity and damp heavily so solid obstacles stop / strongly brake the car
          vx -= 1.08 * vn * nx;
          vz -= 1.08 * vn * nz;

          if (impactSpeed > 2.2) {
            vx *= 0.16;
            vz *= 0.16;
            vForward *= 0.14;
          } else {
            vx *= 0.45;
            vz *= 0.45;
            vForward *= 0.4;
          }

          // Trigger a single 5s penalty per distinct impact event (never spam on the same obstacle)
          const sameObstacleLocked = i === prevColliderIndex && collisionCooldown > 0;
          if (!penaltyTriggered && impactSpeed >= 2.2 && collisionCooldown <= 0 && !sameObstacleLocked) {
            penaltyTriggered = true;
            collisionCooldown = 2.2;
            lastColliderIndex = i;
          }
        }
      }
    }
  }

  return {
    x,
    z,
    vx,
    vz,
    vForward,
    collided,
    penaltyTriggered,
    lastColliderIndex,
    collisionCooldown,
  };
}

export function updateStuckTimer(
  prevStuckSeconds: number,
  input: VehicleInput,
  surfaceZone: SurfaceZone,
  collided: boolean,
  stepDist: number,
  vForward: number,
  dt: number,
): { stuckSeconds: number; isStuck: boolean } {
  const hasDriveIntent = input.throttle > 0.15 || input.brake > 0.15;
  if (!hasDriveIntent) {
    // Intentional stop or coasting: never auto-flag as stuck
    return { stuckSeconds: 0, isStuck: false };
  }

  const actualSpeed = stepDist / Math.max(dt, 1e-4);
  const blockedOrBogged =
    actualSpeed < 1.35 && (collided || surfaceZone !== 'road' || Math.abs(vForward) < 1.4);

  let stuckSeconds = prevStuckSeconds;
  if (blockedOrBogged) {
    stuckSeconds = Math.min(10, prevStuckSeconds + dt);
  } else if (actualSpeed >= 2.6) {
    stuckSeconds = Math.max(0, prevStuckSeconds - dt * 2.5);
  }

  return {
    stuckSeconds,
    isStuck: stuckSeconds >= STUCK_THRESHOLD_SECONDS,
  };
}

export function recoverVehicleToSafeRoad(state: VehicleState, track: TrackField): VehicleState {
  const safeSample = track.getSampleAtDistance(state.lastSafeTrackDistance);
  const safeY = track.getTerrainHeight(safeSample.x, safeSample.z);
  const safeHeading = Math.atan2(safeSample.tx, safeSample.tz);
  const slope = track.getTerrainSlope(safeSample.x, safeSample.z, safeHeading);

  return {
    ...state,
    x: safeSample.x,
    y: safeY,
    z: safeSample.z,
    heading: safeHeading,
    vx: 0,
    vz: 0,
    speed: 0,
    steeringAngle: 0,
    bodyPitch: 0,
    bodyRoll: 0,
    terrainPitch: slope.pitch,
    terrainRoll: slope.roll,
    surfaceZone: 'road',
    isOffRoad: false,
    isDrifting: false,
    lateralSlip: 0,
    closestTrackDistance: safeSample.distance,
    trackProgress: Math.max(0, Math.min(1, safeSample.distance / track.totalLength)),
    lateralOffset: 0,
    lastSafeX: safeSample.x,
    lastSafeY: safeY,
    lastSafeZ: safeSample.z,
    lastSafeHeading: safeHeading,
    lastSafeTrackDistance: safeSample.distance,
    stuckSeconds: 0,
    isStuck: false,
    collisionCooldown: 1.5,
    lastColliderIndex: -1,
  };
}
