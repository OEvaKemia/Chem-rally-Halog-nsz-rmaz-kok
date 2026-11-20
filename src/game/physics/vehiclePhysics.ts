import { TrackField } from '../tracks/trackField';
import type { VehicleInput, VehicleState } from '../types';
import {
  MAX_VALLEY_OFFSET_METERS,
  classifySurfaceZone,
  getSurfaceHandlingProfile,
  resolveObstacleCollisions,
  updateStuckTimer,
  type CircleCollider,
} from './terrainRules';

export type { CircleCollider };

export interface VehicleStepOutcome {
  state: VehicleState;
  collisionPenaltyTriggered: boolean;
}

export function createVehicleStateAtDistance(
  track: TrackField,
  distanceMeters: number,
): VehicleState {
  const sample = track.getSampleAtDistance(distanceMeters);
  const heading = Math.atan2(sample.tx, sample.tz);
  const y = track.getTerrainHeight(sample.x, sample.z);
  const slope = track.getTerrainSlope(sample.x, sample.z, heading);

  return {
    x: sample.x,
    y,
    z: sample.z,
    heading,
    vx: 0,
    vz: 0,
    speed: 0,
    steeringAngle: 0,
    wheelSpin: 0,
    bodyPitch: 0,
    bodyRoll: 0,
    terrainPitch: slope.pitch,
    terrainRoll: slope.roll,
    surfaceZone: 'road',
    isOffRoad: false,
    isDrifting: false,
    lateralSlip: 0,
    distanceTraveled: Math.max(0, sample.distance - 4),
    trackProgress: Math.max(0, Math.min(1, sample.distance / track.totalLength)),
    closestTrackDistance: sample.distance,
    lateralOffset: 0,
    lastSafeX: sample.x,
    lastSafeY: y,
    lastSafeZ: sample.z,
    lastSafeHeading: heading,
    lastSafeTrackDistance: sample.distance,
    stuckSeconds: 0,
    isStuck: false,
    collisionCooldown: 0,
    lastColliderIndex: -1,
    finished: false,
  };
}

export function createInitialVehicleState(track: TrackField): VehicleState {
  return createVehicleStateAtDistance(track, 4);
}

export function stepVehiclePhysicsWithEvents(
  state: VehicleState,
  input: VehicleInput,
  track: TrackField,
  colliders: CircleCollider[],
  dt: number,
): VehicleStepOutcome {
  const clampedDt = Math.min(dt, 0.05);
  if (clampedDt <= 0) {
    return { state, collisionPenaltyTriggered: false };
  }

  const throttle = Math.max(0, Math.min(1, input.throttle));
  const brake = Math.max(0, Math.min(1, input.brake));
  const steerInput = Math.max(-1, Math.min(1, input.steer));

  // Forward and Left unit vectors in XZ plane (0 heading = +Z, +PI/2 = +X left)
  const fwdX = Math.sin(state.heading);
  const fwdZ = Math.cos(state.heading);
  const leftX = Math.cos(state.heading);
  const leftZ = -Math.sin(state.heading);

  // Decompose current velocity into local forward and lateral speeds
  let vForward = state.vx * fwdX + state.vz * fwdZ;
  let vLateral = state.vx * leftX + state.vz * leftZ;

  // Geometry-based surface zone classification (accurate on curves & hairpins)
  const hit = track.getClosestTrackPoint(state.x, state.z);
  const zone = classifySurfaceZone(hit.absLateral, track);
  const profile = getSurfaceHandlingProfile(zone);

  // 1. Steering angle smoothing (speed-dependent & surface-adjusted)
  const absSpeed = Math.abs(vForward);
  const speedSteerScale = 1 / (1 + absSpeed * 0.032);
  const maxSteerAngle = 0.56 * speedSteerScale * profile.steerMaxScale;
  const targetSteer = steerInput * maxSteerAngle;
  const baseSteerRate = steerInput !== 0 ? 8.5 : 11.0;
  const steerRate = baseSteerRate * profile.steerResponsiveness;
  const steeringAngle =
    state.steeringAngle + (targetSteer - state.steeringAngle) * Math.min(1, steerRate * clampedDt);

  // 2. Longitudinal acceleration, braking, reverse
  let longAccel = 0;

  if (throttle > 0) {
    if (vForward < -0.5) {
      // Pressing gas while reversing acts as brake first
      longAccel += 34.0 * throttle;
    } else {
      const speedRatio = Math.max(0, vForward / profile.maxForwardSpeed);
      const torqueCurve = Math.max(0.14, 1.0 - speedRatio * 0.86);
      longAccel += profile.enginePower * torqueCurve * throttle;
    }
  }

  if (brake > 0) {
    if (vForward > 0.45) {
      // Braking while moving forward (slightly looser on off-road)
      const brakeStrength = zone === 'offroad' ? 28.0 : zone === 'shoulder' ? 32.0 : 36.0;
      longAccel -= brakeStrength * brake;
    } else {
      // Stopped or moving slowly -> engage reverse gear
      const revRatio = Math.max(0, -vForward / profile.maxReverseSpeed);
      const revCurve = Math.max(0.1, 1.0 - revRatio);
      longAccel -= 14.5 * revCurve * brake;
    }
  }

  // Rolling resistance + aerodynamic drag + off-road slowdown
  const aeroDrag = 0.014 * absSpeed * vForward;
  if (Math.abs(vForward) > 0.05) {
    longAccel -= Math.sign(vForward) * profile.rollingDrag + aeroDrag;
  } else if (throttle === 0 && brake === 0) {
    vForward = 0;
  }

  // Slope gravity assist/resistance
  const slopeAlongCar = -Math.sin(state.terrainPitch); // positive when climbing
  longAccel -= slopeAlongCar * 8.5;

  const prevForward = vForward;
  vForward += longAccel * clampedDt;

  // Prevent sign overshoot when coasting to a stop
  if (throttle === 0 && brake === 0 && Math.sign(prevForward) !== Math.sign(vForward) && absSpeed < 0.8) {
    vForward = 0;
  }

  // Smoothly decelerate down toward zone speed cap when leaving the road at high speed
  if (vForward > profile.maxForwardSpeed) {
    const excess = vForward - profile.maxForwardSpeed;
    const decelRate = zone === 'offroad' ? 16.5 : 9.5;
    vForward = Math.max(profile.maxForwardSpeed, vForward - Math.min(excess, decelRate * clampedDt));
  }
  vForward = Math.max(-profile.maxReverseSpeed, vForward);

  // 3. Yaw rate from bicycle kinematics (depends on speed & steering angle)
  const wheelbase = 2.65;
  let yawRate = 0;
  if (Math.abs(vForward) > 0.2) {
    const lowSpeedFade = Math.min(1, Math.abs(vForward) / 2.2);
    const surfaceTurnScale = zone === 'shoulder' ? 0.9 : zone === 'offroad' ? 0.95 : 1.0;
    yawRate = (vForward / wheelbase) * Math.tan(steeringAngle) * lowSpeedFade * 1.18 * surfaceTurnScale;
  }
  const heading = state.heading + yawRate * clampedDt;

  // 4. Lateral tire grip & controlled gravel/off-road slip
  vLateral *= Math.exp(-profile.lateralGrip * clampedDt);

  const slipSensitivity = zone === 'offroad' ? 0.085 : zone === 'shoulder' ? 0.07 : 0.055;
  if (Math.abs(vForward) > 7 && Math.abs(steeringAngle) > 0.08) {
    vLateral -= yawRate * vForward * slipSensitivity * clampedDt * 8;
  }

  const newFwdX = Math.sin(heading);
  const newFwdZ = Math.cos(heading);
  const newLeftX = Math.cos(heading);
  const newLeftZ = -Math.sin(heading);

  let vx = newFwdX * vForward + newLeftX * vLateral;
  let vz = newFwdZ * vForward + newLeftZ * vLateral;

  let nextX = state.x + vx * clampedDt;
  let nextZ = state.z + vz * clampedDt;

  // 5. Solid multi-pass obstacle collision (trees, boulders, guardrails, gate posts, service park)
  const colResult = resolveObstacleCollisions(
    nextX,
    nextZ,
    vx,
    vz,
    vForward,
    colliders,
    state.collisionCooldown,
    state.lastColliderIndex,
    clampedDt,
  );
  nextX = colResult.x;
  nextZ = colResult.z;
  vx = colResult.vx;
  vz = colResult.vz;
  vForward = colResult.vForward;

  // 6. Corridor containment (prevents cutting curves across mountains or falling off map)
  const nextHit = track.getClosestTrackPoint(nextX, nextZ);
  if (nextHit.absLateral > MAX_VALLEY_OFFSET_METERS) {
    const toRoadX = nextHit.pointX - nextX;
    const toRoadZ = nextHit.pointZ - nextZ;
    const len = Math.hypot(toRoadX, toRoadZ) || 1;
    const nx = toRoadX / len;
    const nz = toRoadZ / len;
    const excess = nextHit.absLateral - MAX_VALLEY_OFFSET_METERS;
    nextX += nx * excess;
    nextZ += nz * excess;
    const outwardSpeed = vx * -nx + vz * -nz;
    if (outwardSpeed > 0) {
      vx += nx * outwardSpeed * 1.1;
      vz += nz * outwardSpeed * 1.1;
      vx *= 0.65;
      vz *= 0.65;
      vForward *= 0.7;
    }
  }

  // Clamp inside world terrain bounds
  const margin = 12;
  nextX = Math.max(track.bounds.minX + margin, Math.min(track.bounds.maxX - margin, nextX));
  nextZ = Math.max(track.bounds.minZ + margin, Math.min(track.bounds.maxZ - margin, nextZ));

  // Re-evaluate final track projection after containment
  const finalHit = track.getClosestTrackPoint(nextX, nextZ);
  const finalZone = classifySurfaceZone(finalHit.absLateral, track);

  // 7. Grounding & terrain slope
  const nextY = track.getTerrainHeight(nextX, nextZ);
  const slope = track.getTerrainSlope(nextX, nextZ, heading);
  const smoothFactor = Math.min(1, 14 * clampedDt);
  const terrainPitch = state.terrainPitch + (slope.pitch - state.terrainPitch) * smoothFactor;
  const terrainRoll = state.terrainRoll + (slope.roll - state.terrainRoll) * smoothFactor;

  // 8. Suspension visual pitch & roll
  const targetBodyPitch = -Math.max(-0.06, Math.min(0.06, longAccel * 0.0018));
  const targetBodyRoll = Math.max(-0.08, Math.min(0.08, yawRate * Math.min(1, absSpeed / 14) * 0.055));
  const bodyPitch = state.bodyPitch + (targetBodyPitch - state.bodyPitch) * Math.min(1, 10 * clampedDt);
  const bodyRoll = state.bodyRoll + (targetBodyRoll - state.bodyRoll) * Math.min(1, 10 * clampedDt);

  // 9. Wheel spin, odometer & stuck tracking
  const wheelRadius = 0.36;
  const stepDist = Math.hypot(nextX - state.x, nextZ - state.z);
  const wheelSpin = state.wheelSpin + (vForward * clampedDt) / wheelRadius;
  const distanceTraveled = state.distanceTraveled + stepDist;

  // Update last safe road anchor only when genuinely on the road and not colliding
  let lastSafeX = state.lastSafeX;
  let lastSafeY = state.lastSafeY;
  let lastSafeZ = state.lastSafeZ;
  let lastSafeHeading = state.lastSafeHeading;
  let lastSafeTrackDistance = state.lastSafeTrackDistance;
  if (finalZone === 'road' && !colResult.collided) {
    lastSafeX = finalHit.pointX;
    lastSafeY = finalHit.pointY;
    lastSafeZ = finalHit.pointZ;
    lastSafeHeading = Math.atan2(finalHit.tx, finalHit.tz);
    lastSafeTrackDistance = finalHit.distance;
  }

  const stuck = updateStuckTimer(
    state.stuckSeconds,
    input,
    finalZone,
    colResult.collided,
    stepDist,
    vForward,
    clampedDt,
  );

  // Finish gate check requires being on or right alongside the road at the finish gate
  const finishCorridorLimit = track.config.roadHalfWidth + track.config.shoulderWidth + 2.5;
  const finished =
    state.finished ||
    (finalHit.progress >= 0.992 && finalHit.absLateral <= finishCorridorLimit);
  const isDrifting = Math.abs(vLateral) > 2.2 && absSpeed > 8;

  return {
    state: {
      x: nextX,
      y: nextY,
      z: nextZ,
      heading,
      vx,
      vz,
      speed: vForward,
      steeringAngle,
      wheelSpin,
      bodyPitch,
      bodyRoll,
      terrainPitch,
      terrainRoll,
      surfaceZone: finalZone,
      isOffRoad: finalZone !== 'road',
      isDrifting,
      lateralSlip: vLateral,
      distanceTraveled,
      trackProgress: finalHit.progress,
      closestTrackDistance: finalHit.distance,
      lateralOffset: finalHit.lateralOffset,
      lastSafeX,
      lastSafeY,
      lastSafeZ,
      lastSafeHeading,
      lastSafeTrackDistance,
      stuckSeconds: stuck.stuckSeconds,
      isStuck: stuck.isStuck,
      collisionCooldown: colResult.collisionCooldown,
      lastColliderIndex: colResult.lastColliderIndex,
      finished,
    },
    collisionPenaltyTriggered: colResult.penaltyTriggered,
  };
}

export function stepVehiclePhysics(
  state: VehicleState,
  input: VehicleInput,
  track: TrackField,
  colliders: CircleCollider[],
  dt: number,
): VehicleState {
  return stepVehiclePhysicsWithEvents(state, input, track, colliders, dt).state;
}
