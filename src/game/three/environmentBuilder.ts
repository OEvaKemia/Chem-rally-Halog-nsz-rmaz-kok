import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CircleCollider } from '../physics/vehiclePhysics';
import { TrackField } from '../tracks/trackField';
import { createGateBannerTexture, createGravelRoadTexture } from './textures';

export interface EnvironmentBuildResult {
  group: THREE.Group;
  colliders: CircleCollider[];
  updateDust: (
    dt: number,
    carX: number,
    carY: number,
    carZ: number,
    heading: number,
    speed: number,
    isOffRoad: boolean,
    isDrifting: boolean,
  ) => void;
  dispose: () => void;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface EnvironmentPerfOptions {
  terrainSegments: number;
  treeCount: number;
  rockCount: number;
  dustCount: number;
  castDecorShadows: boolean;
}

const DEFAULT_ENV_PERF: EnvironmentPerfOptions = {
  terrainSegments: 165,
  treeCount: 460,
  rockCount: 180,
  dustCount: 140,
  castDecorShadows: true,
};

export function buildRallyEnvironment(
  track: TrackField,
  maxAnisotropy: number,
  perf: EnvironmentPerfOptions = DEFAULT_ENV_PERF,
): EnvironmentBuildResult {
  const group = new THREE.Group();
  const colliders: CircleCollider[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const rand = seededRandom(
    track.config.stageNumber === 1 ? 4207 : 4207 + track.config.stageNumber * 101,
  );

  const { palette } = track.config;

  // 1. Sky Dome
  const skyGeo = new THREE.SphereGeometry(750, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(palette.skyTop) },
      horizonColor: { value: new THREE.Color(palette.skyHorizon) },
      sunDir: { value: new THREE.Vector3(0.55, 0.48, -0.68).normalize() },
      sunColor: { value: new THREE.Color(palette.sunColor) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      varying vec3 vWorldPos;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(h, 0.55));
        float sunAmt = max(dot(dir, sunDir), 0.0);
        col += sunColor * pow(sunAmt, 42.0) * 0.45;
        col += sunColor * pow(sunAmt, 6.0) * 0.12;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyMesh);
  disposables.push(skyGeo, skyMat);

  // 2. Mountain Terrain Mesh with Slope + Elevation Vertex Coloring
  const width = track.bounds.maxX - track.bounds.minX;
  const depth = track.bounds.maxZ - track.bounds.minZ;
  const centerX = (track.bounds.minX + track.bounds.maxX) * 0.5;
  const centerZ = (track.bounds.minZ + track.bounds.maxZ) * 0.5;

  const segsX = perf.terrainSegments;
  const segsZ = perf.terrainSegments;
  const terrainGeo = new THREE.PlaneGeometry(width, depth, segsX, segsZ);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const vertCount = posAttr.count;
  const colors = new Float32Array(vertCount * 3);

  const colShoulder = new THREE.Color(palette.shoulderColor);
  const colGrassA = new THREE.Color(palette.grassColor);
  const colGrassB = new THREE.Color('#3b5932');
  const colRock = new THREE.Color(palette.rockColor);
  const colSnow = new THREE.Color('#dce5ed');
  const tmpColor = new THREE.Color();

  for (let i = 0; i < vertCount; i++) {
    const wx = posAttr.getX(i) + centerX;
    const wz = posAttr.getZ(i) + centerZ;
    const wy = track.getTerrainHeight(wx, wz);
    posAttr.setXYZ(i, wx, wy, wz);
  }

  terrainGeo.computeVertexNormals();
  const normAttr = terrainGeo.attributes.normal as THREE.BufferAttribute;

  for (let i = 0; i < vertCount; i++) {
    const wx = posAttr.getX(i);
    const wy = posAttr.getY(i);
    const wz = posAttr.getZ(i);
    const ny = normAttr.getY(i); // 1 = flat, 0 = vertical cliff

    const hit = track.getClosestTrackPoint(wx, wz);
    const edgeDist = hit.absLateral - track.config.roadHalfWidth;

    const grassMix = 0.5 + 0.5 * Math.sin(wx * 0.08 + wz * 0.06);
    tmpColor.copy(colGrassA).lerp(colGrassB, grassMix);

    // Road shoulder transition
    if (edgeDist < 6.0) {
      const t = Math.max(0, Math.min(1, 1 - edgeDist / 6.0));
      tmpColor.lerp(colShoulder, t * 0.9);
    }

    // Steep rocky slopes
    if (ny < 0.84) {
      const rockT = Math.min(1, (0.84 - ny) / 0.24);
      tmpColor.lerp(colRock, rockT);
    }

    // High Alpine ridge granite & snow dusting
    if (wy > 32) {
      const highRockT = Math.min(1, (wy - 32) / 14);
      tmpColor.lerp(colRock, highRockT * 0.75);
    }
    if (wy > 48 && ny > 0.72) {
      const snowT = Math.min(1, (wy - 48) / 16);
      tmpColor.lerp(colSnow, snowT * 0.7);
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeBoundingSphere();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 3. Gravel Rally Road Ribbon
  const roadTex = createGravelRoadTexture(maxAnisotropy);
  disposables.push(roadTex);

  const roadSamples = track.samples;
  const halfRoad = track.config.roadHalfWidth + track.config.shoulderWidth * 0.5;
  const roadVerts: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  for (let i = 0; i < roadSamples.length; i++) {
    const s = roadSamples[i];
    const lx = s.x + s.rx * halfRoad;
    const lz = s.z + s.rz * halfRoad;
    const rx = s.x - s.rx * halfRoad;
    const rz = s.z - s.rz * halfRoad;
    const y = s.y + 0.045; // Offset above roadbed to prevent Z-fighting

    roadVerts.push(lx, y, lz, rx, y, rz);
    const v = s.distance / 9.0;
    roadUvs.push(0, v, 1, v);

    if (i < roadSamples.length - 1) {
      const base = i * 2;
      roadIndices.push(base, base + 2, base + 1);
      roadIndices.push(base + 1, base + 2, base + 3);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();

  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.9,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);
  disposables.push(roadGeo, roadMat);

  // 4. Start Gate (RAJT) & Finish Gate (CÉL)
  const buildGate = (distance: number, title: string, subtitle: string, accent: string) => {
    const sample = track.getSampleAtDistance(distance);
    const gateGroup = new THREE.Group();
    const heading = Math.atan2(sample.tx, sample.tz);
    gateGroup.position.set(sample.x, sample.y, sample.z);
    gateGroup.rotation.y = heading;

    const gateHalfSpan = track.config.roadHalfWidth + 1.25;
    const postGeo = new THREE.CylinderGeometry(0.22, 0.26, 5.4, 12);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      metalness: 0.65,
      roughness: 0.35,
    });
    const crossbarGeo = new THREE.BoxGeometry(gateHalfSpan * 2 + 0.6, 1.35, 0.35);
    const bannerTex = createGateBannerTexture(title, subtitle, accent, maxAnisotropy);
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      roughness: 0.45,
      metalness: 0.1,
    });
    const bannerFaceGeo = new THREE.PlaneGeometry(gateHalfSpan * 1.92, 1.15);

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(gateHalfSpan, 2.7, 0);
    leftPost.castShadow = true;
    gateGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(-gateHalfSpan, 2.7, 0);
    rightPost.castShadow = true;
    gateGroup.add(rightPost);

    const beam = new THREE.Mesh(crossbarGeo, postMat);
    beam.position.set(0, 5.05, 0);
    beam.castShadow = true;
    gateGroup.add(beam);

    const frontBanner = new THREE.Mesh(bannerFaceGeo, bannerMat);
    frontBanner.position.set(0, 5.05, -0.19);
    frontBanner.rotation.y = Math.PI;
    gateGroup.add(frontBanner);

    const backBanner = new THREE.Mesh(bannerFaceGeo, bannerMat);
    backBanner.position.set(0, 5.05, 0.19);
    gateGroup.add(backBanner);

    // Checkered road line painted across track under the gate
    const lineGeo = new THREE.PlaneGeometry(track.config.roadHalfWidth * 2, 1.1);
    lineGeo.rotateX(-Math.PI / 2);
    const lineMat = new THREE.MeshStandardMaterial({
      color: accent,
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.position.set(0, 0.065, 0);
    gateGroup.add(lineMesh);

    group.add(gateGroup);
    disposables.push(postGeo, postMat, crossbarGeo, bannerTex, bannerMat, bannerFaceGeo, lineGeo, lineMat);

    // Register physical colliders for gate pillars
    const leftWorldX = sample.x + Math.cos(heading) * gateHalfSpan;
    const leftWorldZ = sample.z - Math.sin(heading) * gateHalfSpan;
    const rightWorldX = sample.x - Math.cos(heading) * gateHalfSpan;
    const rightWorldZ = sample.z + Math.sin(heading) * gateHalfSpan;
    colliders.push({ x: leftWorldX, z: leftWorldZ, radius: 0.55 });
    colliders.push({ x: rightWorldX, z: rightWorldZ, radius: 0.55 });
  };

  const cpOffset = (track.config.stageNumber - 1) * 4;
  buildGate(12, 'RAJT', `CHEM RALLY · ${track.config.stageNumber}. SZAKASZ`, '#f97316');
  track.config.checkpoints.forEach((cp, idx) => {
    const cpDist = cp.progress * track.totalLength;
    buildGate(
      cpDist,
      `${cpOffset + idx + 1}. ELLENŐRZŐPONT`,
      'KÉMIAI KIHÍVÁS · ÁLLJ MEG',
      '#f59e0b',
    );
  });
  buildGate(
    track.totalLength - 10,
    'CÉL',
    `${track.config.name.toUpperCase()} · BEFUTÓ`,
    '#10b981',
  );

  // 4b. Rally Szervizpark (kizárólag a 4. szakaszban, a Számításos szerviz mellett)
  let serviceParkCenter: { x: number; z: number } | null = null;
  if (track.config.stageNumber === 4) {
    const spSample = track.getSampleAtDistance(0.68 * track.totalLength);
    const spSide = 1; // bal oldali padka mellett
    const spOffset = track.config.roadHalfWidth + track.config.shoulderWidth + 4.8;
    const spX = spSample.x + spSample.rx * spOffset * spSide;
    const spZ = spSample.z + spSample.rz * spOffset * spSide;
    const spY = track.getTerrainHeight(spX, spZ);
    serviceParkCenter = { x: spX, z: spZ };

    const spGroup = new THREE.Group();
    spGroup.position.set(spX, spY, spZ);
    spGroup.rotation.y = Math.atan2(spSample.tx, spSample.tz);

    const tentPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.1, 8);
    const tentPostMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.6, roughness: 0.35 });
    const tentRoofGeo = new THREE.BoxGeometry(5.6, 0.25, 8.8);
    const tentRoofMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.65 });
    const tireGeo = new THREE.TorusGeometry(0.36, 0.14, 8, 16);
    tireGeo.rotateX(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const toolboxGeo = new THREE.BoxGeometry(1.1, 0.9, 0.6);
    const toolboxMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.25 });
    const spBannerTex = createGateBannerTexture('SZERVIZPARK', 'BAJNOKI DÖNTŐ · SZERVIZ', '#f59e0b', maxAnisotropy);
    const spBannerGeo = new THREE.PlaneGeometry(6.8, 1.0);
    const spBannerMat = new THREE.MeshStandardMaterial({ map: spBannerTex, roughness: 0.45 });

    const roof = new THREE.Mesh(tentRoofGeo, tentRoofMat);
    roof.position.set(0, 3.1, 0);
    roof.castShadow = perf.castDecorShadows;
    spGroup.add(roof);

    for (const [px, pz] of [[-2.5, -4.0], [2.5, -4.0], [-2.5, 4.0], [2.5, 4.0]]) {
      const post = new THREE.Mesh(tentPostGeo, tentPostMat);
      post.position.set(px, 1.55, pz);
      spGroup.add(post);
    }

    // Gumiabroncs-oszlopok és szerszámszekrények
    for (let t = 0; t < 4; t++) {
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.position.set(-1.7, 0.18 + t * 0.27, -2.5);
      spGroup.add(tire);
    }
    const toolbox = new THREE.Mesh(toolboxGeo, toolboxMat);
    toolbox.position.set(1.4, 0.45, 1.8);
    spGroup.add(toolbox);

    // Út felé néző Szervizpark transzparens
    const spBanner = new THREE.Mesh(spBannerGeo, spBannerMat);
    spBanner.position.set(-2.85, 2.75, 0);
    spBanner.rotation.y = -Math.PI / 2;
    spGroup.add(spBanner);

    group.add(spGroup);
    colliders.push({ x: spX, z: spZ, radius: 3.4 });
    disposables.push(
      tentPostGeo,
      tentPostMat,
      tentRoofGeo,
      tentRoofMat,
      tireGeo,
      tireMat,
      toolboxGeo,
      toolboxMat,
      spBannerTex,
      spBannerGeo,
      spBannerMat,
    );
  }

  // 5. Corner Chevron Warning Boards (Placed Ahead of Curves, Non-Mirrored Directional Arrows)
  const createChevronTexture = (direction: 'left' | 'right'): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    // High-visibility rally red background with crisp white border
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#fafafa';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Draw bold double chevrons pointing unambiguously LEFT (<<) or RIGHT (>>)
    const drawChevron = (tipX: number, tailX: number) => {
      const midY = canvas.height / 2;
      const topY = 24;
      const botY = canvas.height - 24;
      const thickness = 34;
      const dir = direction === 'right' ? 1 : -1;

      ctx.fillStyle = '#fafafa';
      ctx.beginPath();
      ctx.moveTo(tailX, topY);
      ctx.lineTo(tailX + dir * thickness, topY);
      ctx.lineTo(tipX, midY);
      ctx.lineTo(tailX + dir * thickness, botY);
      ctx.lineTo(tailX, botY);
      ctx.lineTo(tipX - dir * thickness, midY);
      ctx.closePath();
      ctx.fill();
    };

    if (direction === 'right') {
      drawChevron(126, 40);
      drawChevron(214, 128);
    } else {
      drawChevron(130, 216);
      drawChevron(42, 128);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  };

  const chevronLeftTex = createChevronTexture('left');
  const chevronRightTex = createChevronTexture('right');

  const signPostGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.75, 6);
  const signPostMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.7 });
  const signBackGeo = new THREE.BoxGeometry(1.22, 0.78, 0.06);
  const signBackMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.65, metalness: 0.3 });
  const signFaceGeo = new THREE.PlaneGeometry(1.18, 0.74);
  const signLeftMat = new THREE.MeshStandardMaterial({ map: chevronLeftTex, roughness: 0.38 });
  const signRightMat = new THREE.MeshStandardMaterial({ map: chevronRightTex, roughness: 0.38 });

  disposables.push(
    chevronLeftTex,
    chevronRightTex,
    signPostGeo,
    signPostMat,
    signBackGeo,
    signBackMat,
    signFaceGeo,
    signLeftMat,
    signRightMat,
  );

  let lastSignDist = -40;
  let lastSignDir: 'left' | 'right' | null = null;
  const lookAheadDist = 24;

  for (let i = 8; i < roadSamples.length - 16; i += 2) {
    const s = roadSamples[i];
    if (s.distance < 35 || s.distance > track.totalLength - 35) continue;

    const ahead = track.getSampleAtDistance(s.distance + lookAheadDist);
    const h1 = Math.hypot(s.tx, s.tz) || 1;
    const h2 = Math.hypot(ahead.tx, ahead.tz) || 1;
    const hx1 = s.tx / h1;
    const hz1 = s.tz / h1;
    const hx2 = ahead.tx / h2;
    const hz2 = ahead.tz / h2;

    // Cross product with car's left normal (hz1, -hx1):
    // > 0 means road ahead curves LEFT; < 0 means road ahead curves RIGHT.
    const turnCross = hz1 * hx2 - hx1 * hz2;
    if (Math.abs(turnCross) < 0.24) continue;

    const turnDir: 'left' | 'right' = turnCross > 0 ? 'left' : 'right';
    const minGap = lastSignDir && lastSignDir !== turnDir ? 16 : 26;
    if (s.distance - lastSignDist < minGap) continue;

    lastSignDist = s.distance;
    lastSignDir = turnDir;

    // Place on the OUTSIDE shoulder of the upcoming curve so it is in the driver's line of sight:
    // s.rx/s.rz points LEFT (+1), so LEFT turn outside is RIGHT (-1), RIGHT turn outside is LEFT (+1).
    const side = turnDir === 'left' ? -1 : 1;
    const offset = (track.config.roadHalfWidth + 1.85) * side;
    const sx = s.x + s.rx * offset;
    const sz = s.z + s.rz * offset;
    const sy = track.getTerrainHeight(sx, sz);

    const signGroup = new THREE.Group();
    signGroup.position.set(sx, sy, sz);

    // Local +Z faces the approaching car (-s.tx, -s.tz), slightly angled toward road center.
    // Local -X maps to driver's LEFT (canvas x=0), local +X maps to driver's RIGHT (canvas x=256).
    const facing = Math.atan2(-s.tx, -s.tz);
    signGroup.rotation.y = facing + side * 0.14;

    const post = new THREE.Mesh(signPostGeo, signPostMat);
    post.position.y = 0.875;
    signGroup.add(post);

    const backing = new THREE.Mesh(signBackGeo, signBackMat);
    backing.position.y = 1.52;
    backing.castShadow = perf.castDecorShadows;
    signGroup.add(backing);

    const frontFace = new THREE.Mesh(
      signFaceGeo,
      turnDir === 'left' ? signLeftMat : signRightMat,
    );
    frontFace.position.set(0, 1.52, 0.035);
    signGroup.add(frontFace);

    group.add(signGroup);
    colliders.push({ x: sx, z: sz, radius: 0.35 });
  }

  // 5b. Roadside Guardrails (Korlátok) on Sharp Outer Curves
  const railPostGeo = new THREE.BoxGeometry(0.14, 0.85, 0.14);
  const railBeamGeo = new THREE.BoxGeometry(0.08, 0.28, 2.35);
  const railPostMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.55, roughness: 0.45 });
  const railBeamMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, metalness: 0.35, roughness: 0.5 });
  const railStripeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.55 });
  disposables.push(railPostGeo, railBeamGeo, railPostMat, railBeamMat, railStripeMat);

  const gateDistances = [
    12,
    track.totalLength - 10,
    ...track.config.checkpoints.map((cp) => cp.progress * track.totalLength),
  ];

  let railSegmentIdx = 0;
  for (let i = 6; i < roadSamples.length - 8; i++) {
    const s = roadSamples[i];
    if (Math.abs(s.curvature) < 0.042) continue;
    if (gateDistances.some((gd) => Math.abs(s.distance - gd) < 9.5)) continue;

    // Outside of curve: curvature > 0 turns left (outside is -1 right), curvature < 0 turns right (outside is +1 left)
    const outsideSide = s.curvature > 0 ? -1 : 1;
    if (
      track.config.stageNumber === 4 &&
      outsideSide === 1 &&
      Math.abs(s.distance - 0.68 * track.totalLength) < 16
    ) {
      continue; // Keep Service Park view & clearance uncluttered
    }

    const railOffset = (track.config.roadHalfWidth + track.config.shoulderWidth + 0.55) * outsideSide;
    const rx = s.x + s.rx * railOffset;
    const rz = s.z + s.rz * railOffset;
    const ry = track.getTerrainHeight(rx, rz);

    const railGroup = new THREE.Group();
    railGroup.position.set(rx, ry, rz);
    railGroup.rotation.y = Math.atan2(s.tx, s.tz);

    const post = new THREE.Mesh(railPostGeo, railPostMat);
    post.position.y = 0.425;
    railGroup.add(post);

    const beam = new THREE.Mesh(
      railBeamGeo,
      railSegmentIdx % 3 === 0 ? railStripeMat : railBeamMat,
    );
    beam.position.y = 0.64;
    railGroup.add(beam);

    group.add(railGroup);
    colliders.push({ x: rx, z: rz, radius: 0.55 });
    railSegmentIdx++;
  }

  // 6. Alpine Pine Forest (Multi-Part InstancedMesh: Trunks + 3-Tiered Foliage)
  const isForestStage = track.config.surface === 'forest';
  const treeCount = isForestStage ? Math.round(perf.treeCount * 1.45) : perf.treeCount;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.2, 7);
  trunkGeo.translate(0, 1.1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4b3626,
    roughness: 0.92,
    metalness: 0.0,
  });

  const cone1 = new THREE.ConeGeometry(1.9, 3.2, 8);
  cone1.translate(0, 3.1, 0);
  const cone2 = new THREE.ConeGeometry(1.5, 2.8, 8);
  cone2.translate(0, 4.7, 0);
  const cone3 = new THREE.ConeGeometry(1.0, 2.4, 8);
  cone3.translate(0, 6.2, 0);
  const foliageGeo = mergeGeometries([cone1, cone2, cone3])!;
  cone1.dispose();
  cone2.dispose();
  cone3.dispose();

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Tinted per instance
    roughness: 0.88,
    metalness: 0.02,
  });

  const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const foliageInstanced = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
  trunkInstanced.castShadow = perf.castDecorShadows;
  foliageInstanced.castShadow = perf.castDecorShadows;
  foliageInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const foliagePalette = palette.foliageColors.map((hex) => new THREE.Color(hex));
  const tintColor = new THREE.Color();

  let placedTrees = 0;
  let attempts = 0;
  const maxAttempts = isForestStage ? 6200 : 4500;
  const treeRoadClearance = isForestStage ? 2.4 : 3.2;
  while (placedTrees < treeCount && attempts < maxAttempts) {
    attempts++;
    const tx = track.bounds.minX + 18 + rand() * (width - 36);
    const tz = track.bounds.minZ + 18 + rand() * (depth - 36);
    const hit = track.getClosestTrackPoint(tx, tz);

    // Keep road and shoulder clear
    if (hit.absLateral < track.config.roadHalfWidth + track.config.shoulderWidth + treeRoadClearance) {
      continue;
    }
    if (serviceParkCenter && Math.hypot(tx - serviceParkCenter.x, tz - serviceParkCenter.z) < 11) {
      continue;
    }

    const ty = track.getTerrainHeight(tx, tz);
    // Avoid ultra-high snow peaks
    if (ty > 46) continue;

    const scale = 0.82 + rand() * 0.65;
    dummy.position.set(tx, ty - 0.1, tz);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale * (0.9 + rand() * 0.25), scale);
    dummy.updateMatrix();

    trunkInstanced.setMatrixAt(placedTrees, dummy.matrix);
    foliageInstanced.setMatrixAt(placedTrees, dummy.matrix);

    const baseCol = foliagePalette[Math.floor(rand() * foliagePalette.length)];
    tintColor.copy(baseCol).offsetHSL((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.07);
    foliageInstanced.setColorAt(placedTrees, tintColor);

    // Trees within driving corridor get solid trunk colliders
    if (hit.absLateral < 34) {
      colliders.push({ x: tx, z: tz, radius: Math.max(0.58, 0.72 * scale) });
    }

    placedTrees++;
  }

  trunkInstanced.count = placedTrees;
  foliageInstanced.count = placedTrees;
  trunkInstanced.instanceMatrix.needsUpdate = true;
  foliageInstanced.instanceMatrix.needsUpdate = true;
  if (foliageInstanced.instanceColor) foliageInstanced.instanceColor.needsUpdate = true;
  trunkInstanced.computeBoundingSphere();
  foliageInstanced.computeBoundingSphere();

  group.add(trunkInstanced, foliageInstanced);
  disposables.push(trunkGeo, trunkMat, foliageGeo, foliageMat);

  // 7. Mountain Boulders & Roadside Rocks (InstancedMesh)
  const rockCount = perf.rockCount;
  const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });
  const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInstanced.castShadow = perf.castDecorShadows;
  rockInstanced.receiveShadow = true;

  let placedRocks = 0;
  attempts = 0;
  const rockBase = new THREE.Color(palette.rockColor);
  while (placedRocks < rockCount && attempts < 2400) {
    attempts++;
    const rx = track.bounds.minX + 16 + rand() * (width - 32);
    const rz = track.bounds.minZ + 16 + rand() * (depth - 32);
    const hit = track.getClosestTrackPoint(rx, rz);
    if (hit.absLateral < track.config.roadHalfWidth + track.config.shoulderWidth + 2.2) {
      continue;
    }
    if (serviceParkCenter && Math.hypot(rx - serviceParkCenter.x, rz - serviceParkCenter.z) < 10) {
      continue;
    }

    const ry = track.getTerrainHeight(rx, rz);
    const sx = 0.7 + rand() * 1.9;
    const sy = 0.55 + rand() * 1.3;
    const sz = 0.7 + rand() * 1.9;

    dummy.position.set(rx, ry + sy * 0.25, rz);
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();

    rockInstanced.setMatrixAt(placedRocks, dummy.matrix);
    tintColor.copy(rockBase).offsetHSL(0, 0, (rand() - 0.5) * 0.14);
    rockInstanced.setColorAt(placedRocks, tintColor);

    if (hit.absLateral < 34) {
      colliders.push({ x: rx, z: rz, radius: Math.max(0.52, Math.max(sx, sz) * 0.78) });
    }

    placedRocks++;
  }

  rockInstanced.count = placedRocks;
  rockInstanced.instanceMatrix.needsUpdate = true;
  if (rockInstanced.instanceColor) rockInstanced.instanceColor.needsUpdate = true;
  rockInstanced.computeBoundingSphere();
  group.add(rockInstanced);
  disposables.push(rockGeo, rockMat);

  // 8. Gravel Dust Trail Particle System (Ring Buffer)
  const dustCount = perf.dustCount;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustVelocities = new Float32Array(dustCount * 3);
  const dustLife = new Float32Array(dustCount);

  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3 + 1] = -999;
    dustLife[i] = 0;
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xd6c7b2,
    size: 0.95,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  group.add(dustPoints);
  disposables.push(dustGeo, dustMat);

  let dustCursor = 0;
  let emitAccum = 0;

  const updateDust = (
    dt: number,
    carX: number,
    carY: number,
    carZ: number,
    heading: number,
    speed: number,
    isOffRoad: boolean,
    isDrifting: boolean,
  ) => {
    const absSpeed = Math.abs(speed);
    const posAttrDust = dustGeo.attributes.position as THREE.BufferAttribute;

    // Emit behind rear wheels when moving fast
    if (absSpeed > 4.5) {
      const emitRate = (isDrifting ? 65 : isOffRoad ? 45 : 28) * Math.min(1, absSpeed / 20);
      emitAccum += dt * emitRate;
      const fwdX = Math.sin(heading);
      const fwdZ = Math.cos(heading);
      const leftX = Math.cos(heading);
      const leftZ = -Math.sin(heading);

      while (emitAccum >= 1) {
        emitAccum -= 1;
        const side = dustCursor % 2 === 0 ? 0.85 : -0.85;
        const idx = dustCursor;
        dustCursor = (dustCursor + 1) % dustCount;

        dustPositions[idx * 3] = carX - fwdX * 1.55 + leftX * side + (Math.random() - 0.5) * 0.3;
        dustPositions[idx * 3 + 1] = carY + 0.25 + Math.random() * 0.15;
        dustPositions[idx * 3 + 2] = carZ - fwdZ * 1.55 + leftZ * side + (Math.random() - 0.5) * 0.3;

        dustVelocities[idx * 3] = -fwdX * absSpeed * 0.12 + (Math.random() - 0.5) * 1.4;
        dustVelocities[idx * 3 + 1] = 0.8 + Math.random() * 1.1;
        dustVelocities[idx * 3 + 2] = -fwdZ * absSpeed * 0.12 + (Math.random() - 0.5) * 1.4;

        dustLife[idx] = 0.65 + Math.random() * 0.45;
      }
    }

    for (let i = 0; i < dustCount; i++) {
      if (dustLife[i] > 0) {
        dustLife[i] -= dt;
        dustPositions[i * 3] += dustVelocities[i * 3] * dt;
        dustPositions[i * 3 + 1] += dustVelocities[i * 3 + 1] * dt;
        dustPositions[i * 3 + 2] += dustVelocities[i * 3 + 2] * dt;
        dustVelocities[i * 3] *= 0.96;
        dustVelocities[i * 3 + 2] *= 0.96;
        if (dustLife[i] <= 0) {
          dustPositions[i * 3 + 1] = -999;
        }
      }
    }
    posAttrDust.needsUpdate = true;
  };

  return {
    group,
    colliders,
    updateDust,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}
