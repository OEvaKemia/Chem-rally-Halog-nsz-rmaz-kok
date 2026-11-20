import * as THREE from 'three';
import {
  createContactShadowTexture,
  createRallyPlateTexture,
  createTireTreadTexture,
} from './textures';

export interface RallyCarRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheelPivots: {
    fl: THREE.Group;
    fr: THREE.Group;
  };
  wheelSpinGroups: THREE.Group[];
  brakeLightMaterial: THREE.MeshStandardMaterial;
  dispose: () => void;
}

/**
 * Builds a composite multi-part 3D rally car oriented along +Z (forward),
 * +Y (up), +X (left), with bottom-center ground pivot at y = 0.
 */
export function buildRallyCarModel(maxAnisotropy: number, isSoftwareGl: boolean): RallyCarRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const disposables: Array<{ dispose: () => void }> = [];

  const tireTex = createTireTreadTexture(maxAnisotropy);
  const plateTex = createRallyPlateTexture(maxAnisotropy);
  const shadowTex = createContactShadowTexture();
  disposables.push(tireTex, plateTex, shadowTex);

  // Materials with realistic roughness/metalness contrast
  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: 0xe64818, // Championship rally burnt-orange / crimson
    metalness: 0.42,
    roughness: 0.28,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  });
  const accentTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // Crisp racing white stripe trim
    metalness: 0.15,
    roughness: 0.35,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c20,
    metalness: 0.25,
    roughness: 0.68,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x101c28,
    metalness: 0.1,
    roughness: 0.08,
    clearcoat: 1.0,
    transparent: true,
    opacity: isSoftwareGl ? 0.72 : 0.84,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    map: tireTex,
    roughness: 0.88,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd9a74a, // Iconic rally bronze-gold alloy wheels
    metalness: 0.85,
    roughness: 0.24,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.92,
    roughness: 0.16,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xffe49e,
    emissiveIntensity: 1.5,
    roughness: 0.1,
  });
  const brakeLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc1111,
    emissive: 0xff1e1e,
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    roughness: 0.4,
    metalness: 0.08,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.58,
  });
  disposables.push(
    bodyPaintMat,
    accentTrimMat,
    carbonMat,
    glassMat,
    tireMat,
    rimMat,
    chromeMat,
    headlightMat,
    brakeLightMaterial,
    plateMat,
    shadowMat,
  );

  // 1. Soft contact shadow plane directly beneath chassis
  const shadowGeo = new THREE.PlaneGeometry(2.7, 4.9);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.position.y = 0.03;
  root.add(shadowPlane);
  disposables.push(shadowGeo);

  // 2. Sculpted main car chassis via ExtrudeGeometry (side silhouette -> extruded width)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-2.05, 0.34); // rear lower bumper
  hullShape.lineTo(2.08, 0.32);  // front splitter bottom
  hullShape.lineTo(2.14, 0.62);  // nose bumper
  hullShape.lineTo(1.96, 0.86);  // hood front lip
  hullShape.lineTo(1.06, 0.94);  // cowl / windshield base
  hullShape.lineTo(0.45, 1.44);  // windshield top
  hullShape.lineTo(-0.78, 1.44); // roof rear
  hullShape.lineTo(-1.58, 1.00); // fastback rear glass slope
  hullShape.lineTo(-1.98, 0.96); // trunk deck
  hullShape.lineTo(-2.10, 0.60); // rear bumper
  hullShape.closePath();

  const chassisWidth = 1.66;
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: chassisWidth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  hullGeo.translate(0, 0, -chassisWidth / 2);
  hullGeo.rotateY(-Math.PI / 2); // Shape +X -> Car +Z (forward)
  const hullMesh = new THREE.Mesh(hullGeo, bodyPaintMat);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  bodyGroup.add(hullMesh);
  disposables.push(hullGeo);

  // 3. Racing white livery side stripes & hood stripe
  const stripeGeo = new THREE.BoxGeometry(1.86, 0.04, 1.42);
  const sideStripe = new THREE.Mesh(stripeGeo, accentTrimMat);
  sideStripe.position.set(0, 0.72, -0.05);
  sideStripe.castShadow = true;
  bodyGroup.add(sideStripe);
  disposables.push(stripeGeo);

  // Rally number plates on doors
  const doorPlateGeo = new THREE.PlaneGeometry(0.58, 0.44);
  const leftDoorPlate = new THREE.Mesh(doorPlateGeo, plateMat);
  leftDoorPlate.position.set(0.915, 0.73, -0.05);
  leftDoorPlate.rotation.y = Math.PI / 2;
  bodyGroup.add(leftDoorPlate);

  const rightDoorPlate = new THREE.Mesh(doorPlateGeo, plateMat);
  rightDoorPlate.position.set(-0.915, 0.73, -0.05);
  rightDoorPlate.rotation.y = -Math.PI / 2;
  bodyGroup.add(rightDoorPlate);
  disposables.push(doorPlateGeo);

  // 4. Tinted cabin glass wrap (windshield + side windows + rear glass)
  const windshieldGeo = new THREE.BoxGeometry(1.48, 0.05, 0.78);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 1.21, 0.76);
  windshield.rotation.x = 0.69;
  bodyGroup.add(windshield);

  const rearGlassGeo = new THREE.BoxGeometry(1.42, 0.05, 0.88);
  const rearGlass = new THREE.Mesh(rearGlassGeo, glassMat);
  rearGlass.position.set(0, 1.24, -1.16);
  rearGlass.rotation.x = -0.5;
  bodyGroup.add(rearGlass);

  const sideWindowGeo = new THREE.BoxGeometry(1.74, 0.34, 1.26);
  const sideWindows = new THREE.Mesh(sideWindowGeo, glassMat);
  sideWindows.position.set(0, 1.18, -0.18);
  bodyGroup.add(sideWindows);
  disposables.push(windshieldGeo, rearGlassGeo, sideWindowGeo);

  // 5. Widebody rally fender flares (4 corners)
  const archGeo = new THREE.BoxGeometry(0.24, 0.36, 0.92);
  const archPositions: Array<[number, number, number]> = [
    [0.88, 0.49, 1.32],
    [-0.88, 0.49, 1.32],
    [0.88, 0.49, -1.30],
    [-0.88, 0.49, -1.30],
  ];
  for (const [ax, ay, az] of archPositions) {
    const arch = new THREE.Mesh(archGeo, carbonMat);
    arch.position.set(ax, ay, az);
    arch.castShadow = true;
    bodyGroup.add(arch);
  }
  disposables.push(archGeo);

  // 6. Front splitter, grille & rally skid plate
  const splitterGeo = new THREE.BoxGeometry(1.94, 0.09, 0.32);
  const splitter = new THREE.Mesh(splitterGeo, carbonMat);
  splitter.position.set(0, 0.32, 2.08);
  splitter.castShadow = true;
  bodyGroup.add(splitter);

  const grilleGeo = new THREE.BoxGeometry(1.12, 0.24, 0.08);
  const grille = new THREE.Mesh(grilleGeo, carbonMat);
  grille.position.set(0, 0.56, 2.16);
  bodyGroup.add(grille);

  const skidGeo = new THREE.BoxGeometry(1.2, 0.05, 0.42);
  const skidPlate = new THREE.Mesh(skidGeo, chromeMat);
  skidPlate.position.set(0, 0.26, 1.92);
  skidPlate.rotation.x = -0.32;
  bodyGroup.add(skidPlate);
  disposables.push(splitterGeo, grilleGeo, skidGeo);

  // 7. Hood scoop & Roof rally air scoop
  const hoodScoopGeo = new THREE.BoxGeometry(0.56, 0.1, 0.48);
  const hoodScoop = new THREE.Mesh(hoodScoopGeo, carbonMat);
  hoodScoop.position.set(0, 0.94, 1.36);
  hoodScoop.castShadow = true;
  bodyGroup.add(hoodScoop);

  const roofScoopGeo = new THREE.BoxGeometry(0.42, 0.12, 0.46);
  const roofScoop = new THREE.Mesh(roofScoopGeo, accentTrimMat);
  roofScoop.position.set(0, 1.50, 0.05);
  roofScoop.castShadow = true;
  bodyGroup.add(roofScoop);
  disposables.push(hoodScoopGeo, roofScoopGeo);

  // 8. Iconic WRC Rear Wing (uprights + main blade + endplates)
  const wingBladeGeo = new THREE.BoxGeometry(1.82, 0.07, 0.34);
  const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMat);
  wingBlade.position.set(0, 1.46, -1.94);
  wingBlade.rotation.x = 0.14;
  wingBlade.castShadow = true;
  bodyGroup.add(wingBlade);

  const wingStrutGeo = new THREE.BoxGeometry(0.06, 0.48, 0.22);
  for (const sx of [-0.52, 0.52]) {
    const strut = new THREE.Mesh(wingStrutGeo, carbonMat);
    strut.position.set(sx, 1.22, -1.92);
    strut.castShadow = true;
    bodyGroup.add(strut);
  }
  const endplateGeo = new THREE.BoxGeometry(0.05, 0.24, 0.4);
  for (const ex of [-0.91, 0.91]) {
    const plate = new THREE.Mesh(endplateGeo, bodyPaintMat);
    plate.position.set(ex, 1.44, -1.94);
    plate.castShadow = true;
    bodyGroup.add(plate);
  }
  disposables.push(wingBladeGeo, wingStrutGeo, endplateGeo);

  // 9. Side mirrors & dual exhaust pipes
  const mirrorGeo = new THREE.BoxGeometry(0.22, 0.11, 0.14);
  for (const mx of [-0.98, 0.98]) {
    const mirror = new THREE.Mesh(mirrorGeo, bodyPaintMat);
    mirror.position.set(mx, 1.02, 0.56);
    bodyGroup.add(mirror);
  }
  const exhaustGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  for (const ex of [-0.46, 0.46]) {
    const pipe = new THREE.Mesh(exhaustGeo, chromeMat);
    pipe.position.set(ex, 0.33, -2.14);
    bodyGroup.add(pipe);
  }
  disposables.push(mirrorGeo, exhaustGeo);

  // 10. Headlights, auxiliary 4-pod rally lamps & rear LED tail/brake lights
  const headlightGeo = new THREE.BoxGeometry(0.32, 0.14, 0.08);
  for (const hx of [-0.62, 0.62]) {
    const lamp = new THREE.Mesh(headlightGeo, headlightMat);
    lamp.position.set(hx, 0.72, 2.11);
    bodyGroup.add(lamp);
  }
  const podLampGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.12, 14);
  podLampGeo.rotateX(Math.PI / 2);
  for (const px of [-0.34, -0.12, 0.12, 0.34]) {
    const pod = new THREE.Mesh(podLampGeo, headlightMat);
    pod.position.set(px, 0.87, 1.98);
    bodyGroup.add(pod);
  }
  const tailLightGeo = new THREE.BoxGeometry(0.42, 0.13, 0.07);
  for (const tx of [-0.58, 0.58]) {
    const tail = new THREE.Mesh(tailLightGeo, brakeLightMaterial);
    tail.position.set(tx, 0.78, -2.10);
    bodyGroup.add(tail);
  }
  disposables.push(headlightGeo, podLampGeo, tailLightGeo);

  // 11. Four Detailed Wheels (tire + spoke alloy rim + hub + brake disc)
  const wheelRadius = 0.36;
  const wheelWidth = 0.28;
  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
  tireGeo.rotateZ(Math.PI / 2); // Axle along X

  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, wheelWidth + 0.015, 16);
  rimGeo.rotateZ(Math.PI / 2);

  const spokeGeo = new THREE.BoxGeometry(wheelWidth + 0.03, 0.045, 0.42);
  const hubGeo = new THREE.CylinderGeometry(0.07, 0.07, wheelWidth + 0.04, 12);
  hubGeo.rotateZ(Math.PI / 2);
  disposables.push(tireGeo, rimGeo, spokeGeo, hubGeo);

  const wheelSpinGroups: THREE.Group[] = [];

  const createWheel = (x: number, z: number): { steerPivot: THREE.Group; spinGroup: THREE.Group } => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(x, wheelRadius, z);

    const spinGroup = new THREE.Group();
    steerPivot.add(spinGroup);

    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    tire.receiveShadow = true;
    spinGroup.add(tire);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    spinGroup.add(rim);

    // 3 intersecting spokes (6-spoke visual star) so rotation is ultra-clear
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.rotation.x = (s * Math.PI) / 3;
      spinGroup.add(spoke);
    }

    const hub = new THREE.Mesh(hubGeo, carbonMat);
    spinGroup.add(hub);

    root.add(steerPivot);
    wheelSpinGroups.push(spinGroup);
    return { steerPivot, spinGroup };
  };

  const fl = createWheel(0.90, 1.32);
  const fr = createWheel(-0.90, 1.32);
  createWheel(0.90, -1.30);
  createWheel(-0.90, -1.30);

  return {
    root,
    bodyGroup,
    wheelPivots: {
      fl: fl.steerPivot,
      fr: fr.steerPivot,
    },
    wheelSpinGroups,
    brakeLightMaterial,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}
