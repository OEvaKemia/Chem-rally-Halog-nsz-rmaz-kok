import * as THREE from 'three';
import type { StageConfig } from '../types';

export interface TrackSample {
  distance: number;
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  rx: number; // right vector X (or left vector X)
  rz: number;
  curvature: number;
}

export interface ClosestTrackHit {
  distance: number; // meters from start
  progress: number; // 0..1
  lateralOffset: number; // signed offset
  absLateral: number;
  pointX: number;
  pointY: number;
  pointZ: number;
  tx: number;
  ty: number;
  tz: number;
  curvature: number;
}

const CELL_SIZE = 16;

function hash2D(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2D(x: number, z: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    value += amp * (valueNoise2D(x * freq, z * freq) * 2 - 1);
    freq *= 2.05;
    amp *= 0.48;
  }
  return value;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class TrackField {
  public readonly config: StageConfig;
  public readonly curve: THREE.CatmullRomCurve3;
  public readonly samples: TrackSample[] = [];
  public readonly totalLength: number;
  public readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  private readonly spatialGrid = new Map<string, number[]>();

  constructor(config: StageConfig) {
    this.config = config;
    const pts = config.controlPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45);
    this.totalLength = this.curve.getLength();

    const sampleCount = Math.max(420, Math.round(this.totalLength / 2.0));
    const rawPts: THREE.Vector3[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const u = i / sampleCount;
      rawPts.push(this.curve.getPointAt(u));
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let accumDist = 0;

    for (let i = 0; i <= sampleCount; i++) {
      const p = rawPts[i];
      if (i > 0) {
        accumDist += p.distanceTo(rawPts[i - 1]);
      }

      const prev = rawPts[Math.max(0, i - 1)];
      const next = rawPts[Math.min(sampleCount, i + 1)];
      const tangent = new THREE.Vector3().subVectors(next, prev).normalize();

      // Horizontal perpendicular vector (left of tangent in XZ)
      const horizLen = Math.hypot(tangent.x, tangent.z) || 1;
      const hx = tangent.x / horizLen;
      const hz = tangent.z / horizLen;
      const rx = hz;
      const rz = -hx;

      // Curvature estimate
      let curvature = 0;
      if (i > 2 && i < sampleCount - 2) {
        const tPrev = new THREE.Vector3().subVectors(p, rawPts[i - 2]).setY(0).normalize();
        const tNext = new THREE.Vector3().subVectors(rawPts[i + 2], p).setY(0).normalize();
        const crossY = tPrev.z * tNext.x - tPrev.x * tNext.z;
        curvature = crossY;
      }

      this.samples.push({
        distance: accumDist,
        x: p.x,
        y: p.y,
        z: p.z,
        tx: tangent.x,
        ty: tangent.y,
        tz: tangent.z,
        rx,
        rz,
        curvature,
      });

      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const margin = 130;
    this.bounds = {
      minX: minX - margin,
      maxX: maxX + margin,
      minZ: minZ - margin,
      maxZ: maxZ + margin,
    };

    // Populate spatial hash for O(1) track distance lookup
    for (let i = 0; i < this.samples.length - 1; i++) {
      const s = this.samples[i];
      const cx = Math.floor(s.x / CELL_SIZE);
      const cz = Math.floor(s.z / CELL_SIZE);
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const key = `${cx + dx},${cz + dz}`;
          let arr = this.spatialGrid.get(key);
          if (!arr) {
            arr = [];
            this.spatialGrid.set(key, arr);
          }
          arr.push(i);
        }
      }
    }
  }

  public getClosestTrackPoint(x: number, z: number): ClosestTrackHit {
    const cx = Math.floor(x / CELL_SIZE);
    const cz = Math.floor(z / CELL_SIZE);
    const candidates = this.spatialGrid.get(`${cx},${cz}`);

    let bestDistSq = Infinity;
    let bestT = 0;
    let bestIdx = 0;

    const evalSegment = (i: number) => {
      const a = this.samples[i];
      const b = this.samples[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const abLenSq = abx * abx + abz * abz || 1e-6;
      const apx = x - a.x;
      const apz = z - a.z;
      const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq));
      const px = a.x + abx * t;
      const pz = a.z + abz * t;
      const dx = x - px;
      const dz = z - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestT = t;
        bestIdx = i;
      }
    };

    if (candidates && candidates.length > 0) {
      for (let k = 0; k < candidates.length; k++) {
        evalSegment(candidates[k]);
      }
    } else {
      for (let i = 0; i < this.samples.length - 1; i++) {
        evalSegment(i);
      }
    }

    const a = this.samples[bestIdx];
    const b = this.samples[bestIdx + 1];
    const pointX = a.x + (b.x - a.x) * bestT;
    const pointY = a.y + (b.y - a.y) * bestT;
    const pointZ = a.z + (b.z - a.z) * bestT;
    const distance = a.distance + (b.distance - a.distance) * bestT;

    const tx = a.tx + (b.tx - a.tx) * bestT;
    const ty = a.ty + (b.ty - a.ty) * bestT;
    const tz = a.tz + (b.tz - a.tz) * bestT;
    const tLen = Math.hypot(tx, ty, tz) || 1;

    const rx = a.rx + (b.rx - a.rx) * bestT;
    const rz = a.rz + (b.rz - a.rz) * bestT;
    const lateralOffset = (x - pointX) * rx + (z - pointZ) * rz;

    return {
      distance,
      progress: Math.max(0, Math.min(1, distance / this.totalLength)),
      lateralOffset,
      absLateral: Math.sqrt(bestDistSq),
      pointX,
      pointY,
      pointZ,
      tx: tx / tLen,
      ty: ty / tLen,
      tz: tz / tLen,
      curvature: a.curvature + (b.curvature - a.curvature) * bestT,
    };
  }

  public getSampleAtDistance(distance: number): TrackSample {
    const clamped = Math.max(0, Math.min(this.totalLength, distance));
    let lo = 0;
    let hi = this.samples.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.samples[mid].distance <= clamped) lo = mid;
      else hi = mid;
    }
    const a = this.samples[lo];
    const b = this.samples[hi];
    const span = b.distance - a.distance || 1;
    const t = Math.max(0, Math.min(1, (clamped - a.distance) / span));
    return {
      distance: clamped,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      tx: a.tx + (b.tx - a.tx) * t,
      ty: a.ty + (b.ty - a.ty) * t,
      tz: a.tz + (b.tz - a.tz) * t,
      rx: a.rx + (b.rx - a.rx) * t,
      rz: a.rz + (b.rz - a.rz) * t,
      curvature: a.curvature + (b.curvature - a.curvature) * t,
    };
  }

  public getTerrainHeight(x: number, z: number): number {
    const hit = this.getClosestTrackPoint(x, z);
    const roadEdge = this.config.roadHalfWidth + this.config.shoulderWidth;

    if (hit.absLateral <= roadEdge) {
      return hit.pointY;
    }

    // Natural Alpine mountain topography surrounding the road
    const macroHill = fbm2D(x * 0.0085 + 3.1, z * 0.0085 - 1.7) * 18.0;
    const midDetail = fbm2D(x * 0.028 - 4.2, z * 0.028 + 6.4) * 3.8;
    const ridgeRise = smoothstep(14, 75, hit.absLateral) * 26.0;
    const outerPeaks = smoothstep(55, 130, hit.absLateral) * 38.0;

    // Preserve natural elevation offset relative to nearby road plus rolling peaks
    const rawMountainY =
      hit.pointY +
      Math.max(-2.5, macroHill * 0.55 + midDetail) +
      ridgeRise * (0.55 + 0.45 * Math.max(0, valueNoise2D(x * 0.015, z * 0.015))) +
      outerPeaks * (0.4 + 0.6 * valueNoise2D(x * 0.012 + 10, z * 0.012 - 5));

    const blend = smoothstep(roadEdge, roadEdge + 14.0, hit.absLateral);
    return hit.pointY + (rawMountainY - hit.pointY) * blend;
  }

  public getTerrainSlope(x: number, z: number, heading: number): { pitch: number; roll: number } {
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const lx = Math.cos(heading);
    const lz = -Math.sin(heading);

    const hFront = this.getTerrainHeight(x + fx * 1.6, z + fz * 1.6);
    const hBack = this.getTerrainHeight(x - fx * 1.6, z - fz * 1.6);
    const hLeft = this.getTerrainHeight(x + lx * 1.0, z + lz * 1.0);
    const hRight = this.getTerrainHeight(x - lx * 1.0, z - lz * 1.0);

    // Nose up is negative pitch around +X; left up is positive roll around +Z
    const pitch = -Math.atan2(hFront - hBack, 3.2);
    const roll = Math.atan2(hLeft - hRight, 2.0);
    return { pitch, roll };
  }
}
