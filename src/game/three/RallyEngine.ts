import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  COLLISION_PENALTY_SECONDS,
  RECOVERY_PENALTY_SECONDS,
  recoverVehicleToSafeRoad,
  type CircleCollider,
} from '../physics/terrainRules';
import {
  createInitialVehicleState,
  createVehicleStateAtDistance,
  stepVehiclePhysics,
  stepVehiclePhysicsWithEvents,
} from '../physics/vehiclePhysics';
import { TrackField } from '../tracks/trackField';
import type {
  GamePhase,
  StageCheckpoint,
  StageConfig,
  TelemetrySnapshot,
  VehicleInput,
  VehicleState,
} from '../types';
import { buildRallyEnvironment, type EnvironmentBuildResult } from './environmentBuilder';
import { buildRallyCarModel, type RallyCarRig } from './rallyCarModel';

const _camDesiredPos = new THREE.Vector3();
const _camDesiredLook = new THREE.Vector3();
const _camCurrentLook = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return uaMobile || coarse;
}

function computeGearLabel(speedMs: number): string {
  if (speedMs < -0.5) return 'R';
  const kmh = Math.abs(speedMs) * 3.6;
  if (kmh < 2) return 'N';
  if (kmh < 28) return '1';
  if (kmh < 54) return '2';
  if (kmh < 82) return '3';
  if (kmh < 108) return '4';
  return '5';
}

export interface RallyEngineCallbacks {
  onTelemetry: (snapshot: TelemetrySnapshot) => void;
  onFinish: (snapshot: TelemetrySnapshot) => void;
  onCheckpointReached?: (checkpoint: StageCheckpoint) => void;
  onPenalty?: (reason: 'collision' | 'recovery', seconds: number) => void;
  onContextLost?: (lost: boolean) => void;
}

export class RallyEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: RallyEngineCallbacks;
  private readonly isSoftwareGl: boolean;
  private readonly isMobileDevice: boolean;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly envRT: THREE.WebGLRenderTarget;

  private track: TrackField;
  private envBuild: EnvironmentBuildResult;
  private carRig: RallyCarRig;
  private colliders: CircleCollider[];
  private vehicleState: VehicleState;

  private phase: GamePhase = 'menu';
  private input: VehicleInput = { throttle: 0, brake: 0, steer: 0 };
  private elapsedSeconds = 0;
  private drivingPenaltySeconds = 0;
  private lastTelemetryEmit = 0;
  private cameraInitialized = false;
  private completedCheckpoints = new Set<string>();
  private activeCheckpoint: StageCheckpoint | null = null;

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    stage: StageConfig,
    callbacks: RallyEngineCallbacks,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.isMobileDevice = detectMobileDevice();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);

    // 1. Renderer setup per Three.js studio rendering standards (mobile-tuned DPR & shadows)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.isMobileDevice,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    const maxDpr = this.isSoftwareGl ? 1 : this.isMobileDevice ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = this.isMobileDevice
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    container.appendChild(this.renderer.domElement);

    // WebGL context loss safety listeners
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    // 2. Scene, Fog & Studio Environment Reflections
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(stage.palette.skyHorizon);
    this.scene.fog = new THREE.FogExp2(stage.palette.fogColor, 0.0024);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmremGenerator.dispose();

    // 3. Camera (wider vertical FOV on narrow portrait viewports so track never clips)
    const baseFov = aspect < 1.05 ? 68 : 58;
    this.camera = new THREE.PerspectiveCamera(baseFov, aspect, 0.4, 950);

    // 4. Warm/Cool Outdoor Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      stage.palette.hemiSkyColor,
      stage.palette.hemiGroundColor,
      0.85,
    );
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(
      stage.palette.sunColor,
      stage.palette.sunIntensity,
    );
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowSize = this.isMobileDevice ? 1024 : 2048;
    this.sunLight.shadow.mapSize.width = shadowSize;
    this.sunLight.shadow.mapSize.height = shadowSize;
    const shadowBound = 38;
    this.sunLight.shadow.camera.left = -shadowBound;
    this.sunLight.shadow.camera.right = shadowBound;
    this.sunLight.shadow.camera.top = shadowBound;
    this.sunLight.shadow.camera.bottom = -shadowBound;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 5. Track, Environment & Rally Car
    const maxAnisotropy = Math.min(
      this.isMobileDevice ? 4 : 8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    this.track = new TrackField(stage);
    const envPerf = this.isMobileDevice
      ? {
          terrainSegments: 112,
          treeCount: 280,
          rockCount: 110,
          dustCount: 72,
          castDecorShadows: false,
        }
      : {
          terrainSegments: 165,
          treeCount: 460,
          rockCount: 180,
          dustCount: 140,
          castDecorShadows: true,
        };
    this.envBuild = buildRallyEnvironment(this.track, maxAnisotropy, envPerf);
    this.colliders = this.envBuild.colliders;
    this.scene.add(this.envBuild.group);

    this.carRig = buildRallyCarModel(maxAnisotropy, this.isSoftwareGl);
    this.scene.add(this.carRig.root);

    this.vehicleState = createInitialVehicleState(this.track);
    this.syncCarTransform();
    this.snapCameraImmediate(true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 6. Responsive ResizeObserver + Mobile Orientation / VisualViewport Listeners
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    window.addEventListener('orientationchange', this.onWindowResizeBound);
    window.visualViewport?.addEventListener('resize', this.onWindowResizeBound);

    this.emitTelemetry(true);
    this.clock.start();
    this.startLoop();
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onContextLost?.(true);
  };

  private handleContextRestored = (): void => {
    this.callbacks.onContextLost?.(false);
  };

  private onWindowResizeBound = (): void => {
    this.handleResize();
  };

  private handleResize(): void {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) return;

    const aspect = width / height;
    this.camera.aspect = aspect;
    if (this.phase === 'menu') {
      this.camera.fov = aspect < 1.05 ? 68 : 58;
    }
    this.camera.updateProjectionMatrix();
    const maxDpr = this.isSoftwareGl ? 1 : this.isMobileDevice ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.setSize(width, height);
  }

  public setPhase(phase: GamePhase): void {
    this.phase = phase;
  }

  public setInput(input: VehicleInput): void {
    this.input = input;
  }

  public resetStage(): void {
    this.vehicleState = createInitialVehicleState(this.track);
    this.elapsedSeconds = 0;
    this.drivingPenaltySeconds = 0;
    this.completedCheckpoints.clear();
    this.activeCheckpoint = null;
    this.syncCarTransform();
    this.snapCameraImmediate(this.phase === 'menu');
    this.emitTelemetry(true);
  }

  public recoverToRoad(): void {
    if (this.phase !== 'running') return;
    this.vehicleState = recoverVehicleToSafeRoad(this.vehicleState, this.track);
    this.drivingPenaltySeconds += RECOVERY_PENALTY_SECONDS;
    this.syncCarTransform();
    this.snapCameraImmediate(false);
    this.emitTelemetry(true);
    this.callbacks.onPenalty?.('recovery', RECOVERY_PENALTY_SECONDS);
  }

  public jumpToCheckpoint(checkpointId: string, openImmediately = false): void {
    const idx = this.track.config.checkpoints.findIndex((c) => c.id === checkpointId);
    if (idx < 0) return;
    const cp = this.track.config.checkpoints[idx];

    this.elapsedSeconds = 0;
    this.drivingPenaltySeconds = 0;
    this.completedCheckpoints.clear();
    for (let i = 0; i < idx; i++) {
      this.completedCheckpoints.add(this.track.config.checkpoints[i].id);
    }

    const spawnDist = Math.max(8, cp.progress * this.track.totalLength - 14);
    this.vehicleState = createVehicleStateAtDistance(this.track, spawnDist);
    this.syncCarTransform();
    this.snapCameraImmediate(false);

    if (openImmediately) {
      this.activeCheckpoint = cp;
      this.phase = 'paused';
      this.emitTelemetry(true);
      this.callbacks.onCheckpointReached?.(cp);
    } else {
      this.activeCheckpoint = null;
      this.phase = 'running';
      this.emitTelemetry(true);
    }
  }

  public jumpNearFinishGate(): void {
    this.elapsedSeconds = 0;
    this.drivingPenaltySeconds = 0;
    this.completedCheckpoints.clear();
    for (const cp of this.track.config.checkpoints) {
      this.completedCheckpoints.add(cp.id);
    }
    this.activeCheckpoint = null;
    const spawnDist = Math.max(8, this.track.totalLength * 0.992 - 22);
    this.vehicleState = createVehicleStateAtDistance(this.track, spawnDist);
    this.phase = 'running';
    this.syncCarTransform();
    this.snapCameraImmediate(false);
    this.emitTelemetry(true);
  }

  public resumeFromCheckpoint(): void {
    if (this.activeCheckpoint) {
      this.completedCheckpoints.add(this.activeCheckpoint.id);
      this.activeCheckpoint = null;
    }
    this.phase = 'running';
    this.emitTelemetry(true);
  }

  public getVehicleSnapshot(): VehicleState {
    return this.vehicleState;
  }

  private syncCarTransform(): void {
    const s = this.vehicleState;
    this.carRig.root.position.set(s.x, s.y, s.z);
    this.carRig.root.rotation.order = 'YXZ';
    this.carRig.root.rotation.y = s.heading;
    this.carRig.root.rotation.x = s.terrainPitch;
    this.carRig.root.rotation.z = s.terrainRoll;

    // Suspension pitch & roll on body group
    this.carRig.bodyGroup.rotation.x = s.bodyPitch;
    this.carRig.bodyGroup.rotation.z = s.bodyRoll;

    // Front wheel steering & all-wheel spin
    this.carRig.wheelPivots.fl.rotation.y = s.steeringAngle;
    this.carRig.wheelPivots.fr.rotation.y = s.steeringAngle;

    for (let i = 0; i < this.carRig.wheelSpinGroups.length; i++) {
      this.carRig.wheelSpinGroups[i].rotation.x = s.wheelSpin;
    }

    // Brake light glow response
    const braking = this.phase === 'running' && this.input.brake > 0 && s.speed > 0.2;
    this.carRig.brakeLightMaterial.emissiveIntensity = braking ? 2.8 : 0.45;

    // Keep shadow frustum centered around the rally car
    this.sunLight.position.set(s.x + 36, s.y + 44, s.z - 32);
    this.sunLight.target.position.set(s.x, s.y, s.z);
    this.sunLight.target.updateMatrixWorld();
  }

  private snapCameraImmediate(menuAngle: boolean): void {
    const s = this.vehicleState;
    const fwdX = Math.sin(s.heading);
    const fwdZ = Math.cos(s.heading);
    const leftX = Math.cos(s.heading);
    const leftZ = -Math.sin(s.heading);

    if (menuAngle) {
      // Hero rear-quarter perspective showing car + Start Gate + mountain curve ahead
      this.camera.position.set(
        s.x - fwdX * 7.8 + leftX * 2.4,
        s.y + 2.9,
        s.z - fwdZ * 7.8 + leftZ * 2.4,
      );
      _camCurrentLook.set(s.x + fwdX * 9.0, s.y + 1.5, s.z + fwdZ * 9.0);
    } else {
      this.camera.position.set(s.x - fwdX * 7.2, s.y + 2.85, s.z - fwdZ * 7.2);
      _camCurrentLook.set(s.x + fwdX * 7.5, s.y + 1.25, s.z + fwdZ * 7.5);
    }
    this.camera.lookAt(_camCurrentLook);
    this.cameraInitialized = true;
  }

  private updateCamera(dt: number): void {
    const s = this.vehicleState;
    const fwdX = Math.sin(s.heading);
    const fwdZ = Math.cos(s.heading);
    const leftX = Math.cos(s.heading);
    const leftZ = -Math.sin(s.heading);

    if (this.phase === 'menu') {
      _camDesiredPos.set(
        s.x - fwdX * 7.8 + leftX * 2.4,
        s.y + 2.9,
        s.z - fwdZ * 7.8 + leftZ * 2.4,
      );
      _camDesiredLook.set(s.x + fwdX * 9.0, s.y + 1.5, s.z + fwdZ * 9.0);
    } else {
      const speedNorm = Math.min(1, Math.abs(s.speed) / 36);
      const isReversing = s.speed < -1.5;

      // Dynamic chase distance & slight look-ahead into turns
      const followDist = isReversing ? 6.4 : 6.9 + speedNorm * 1.3;
      const followHeight = 2.65 + speedNorm * 0.45;
      const sideLead = s.steeringAngle * (1.8 + speedNorm * 2.2);

      _camDesiredPos.set(
        s.x - fwdX * followDist - leftX * sideLead * 0.35,
        s.y + followHeight,
        s.z - fwdZ * followDist - leftZ * sideLead * 0.35,
      );

      // Prevent camera from dipping below terrain
      const camGround = this.track.getTerrainHeight(_camDesiredPos.x, _camDesiredPos.z);
      if (_camDesiredPos.y < camGround + 1.35) {
        _camDesiredPos.y = camGround + 1.35;
      }

      _camDesiredLook.set(
        s.x + fwdX * (6.5 + speedNorm * 4.0) + leftX * sideLead * 0.65,
        s.y + 1.25,
        s.z + fwdZ * (6.5 + speedNorm * 4.0) + leftZ * sideLead * 0.65,
      );

      // Subtle dynamic FOV widening with speed (adapts to narrow portrait vs wide landscape)
      const baseFov = this.camera.aspect < 1.05 ? 68 : 58;
      const targetFov = baseFov + speedNorm * 11;
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
        this.camera.updateProjectionMatrix();
      }
    }

    if (!this.cameraInitialized) {
      this.camera.position.copy(_camDesiredPos);
      _camCurrentLook.copy(_camDesiredLook);
      this.cameraInitialized = true;
    } else {
      const posLambda = this.phase === 'menu' ? 4.0 : 8.5;
      const lookLambda = this.phase === 'menu' ? 4.0 : 12.0;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesiredPos.x, posLambda, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesiredPos.y, posLambda, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesiredPos.z, posLambda, dt);

      _camCurrentLook.x = THREE.MathUtils.damp(_camCurrentLook.x, _camDesiredLook.x, lookLambda, dt);
      _camCurrentLook.y = THREE.MathUtils.damp(_camCurrentLook.y, _camDesiredLook.y, lookLambda, dt);
      _camCurrentLook.z = THREE.MathUtils.damp(_camCurrentLook.z, _camDesiredLook.z, lookLambda, dt);
    }

    this.camera.lookAt(_camCurrentLook);
  }

  private emitTelemetry(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastTelemetryEmit < 50) return;
    this.lastTelemetryEmit = now;

    const s = this.vehicleState;
    const snapshot: TelemetrySnapshot = {
      speedKmh: Math.round(Math.abs(s.speed) * 3.6),
      gear: computeGearLabel(s.speed),
      elapsedSeconds: this.elapsedSeconds,
      drivingPenaltySeconds: this.drivingPenaltySeconds,
      distanceMeters: Math.round(s.distanceTraveled),
      totalDistanceMeters: Math.round(this.track.totalLength),
      progress: s.trackProgress,
      surfaceZone: s.surfaceZone,
      isOffRoad: s.isOffRoad,
      isDrifting: s.isDrifting,
      isStuck: s.isStuck,
      headingDeg: Math.round((((s.heading * 180) / Math.PI) % 360 + 360) % 360),
      finished: s.finished,
      checkpointsCompleted: this.completedCheckpoints.size,
      totalCheckpoints: this.track.config.checkpoints.length,
    };
    this.callbacks.onTelemetry(snapshot);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDelta = this.clock.getDelta();
    const dt = Math.min(rawDelta, 0.05);

    if (this.phase === 'running') {
      this.elapsedSeconds += dt;
      // Fixed-step sub-stepping for crisp, framerate-independent driving physics
      const subSteps = dt > 0.025 ? 2 : 1;
      const subDt = dt / subSteps;
      let penaltyTriggered = false;
      for (let i = 0; i < subSteps; i++) {
        const outcome = stepVehiclePhysicsWithEvents(
          this.vehicleState,
          this.input,
          this.track,
          this.colliders,
          subDt,
        );
        this.vehicleState = outcome.state;
        if (outcome.collisionPenaltyTriggered) {
          penaltyTriggered = true;
        }
      }
      if (penaltyTriggered) {
        this.drivingPenaltySeconds += COLLISION_PENALTY_SECONDS;
        this.emitTelemetry(true);
        this.callbacks.onPenalty?.('collision', COLLISION_PENALTY_SECONDS);
      }

      // Ellenőrzőpont-kapun való áthaladás érzékelése: csak az út/padka sávban érvényes
      if (!this.activeCheckpoint) {
        const gateCorridor = this.track.config.roadHalfWidth + this.track.config.shoulderWidth + 2.5;
        const nextCp = this.track.config.checkpoints.find(
          (cp) =>
            !this.completedCheckpoints.has(cp.id) &&
            this.vehicleState.closestTrackDistance >= cp.progress * this.track.totalLength &&
            Math.abs(this.vehicleState.lateralOffset) <= gateCorridor,
        );
        if (nextCp) {
          this.activeCheckpoint = nextCp;
          this.phase = 'paused';
          this.vehicleState = {
            ...this.vehicleState,
            vx: 0,
            vz: 0,
            speed: 0,
            bodyPitch: 0,
            bodyRoll: 0,
            stuckSeconds: 0,
            isStuck: false,
          };
          this.emitTelemetry(true);
          this.callbacks.onCheckpointReached?.(nextCp);
        }
      }

      if (this.phase === 'running' && this.vehicleState.finished) {
        this.phase = 'finished';
        this.emitTelemetry(true);
        const snap: TelemetrySnapshot = {
          speedKmh: Math.round(Math.abs(this.vehicleState.speed) * 3.6),
          gear: computeGearLabel(this.vehicleState.speed),
          elapsedSeconds: this.elapsedSeconds,
          drivingPenaltySeconds: this.drivingPenaltySeconds,
          distanceMeters: Math.round(this.vehicleState.distanceTraveled),
          totalDistanceMeters: Math.round(this.track.totalLength),
          progress: 1,
          surfaceZone: this.vehicleState.surfaceZone,
          isOffRoad: this.vehicleState.isOffRoad,
          isDrifting: this.vehicleState.isDrifting,
          isStuck: false,
          headingDeg: 0,
          finished: true,
          checkpointsCompleted: this.completedCheckpoints.size,
          totalCheckpoints: this.track.config.checkpoints.length,
        };
        this.callbacks.onFinish(snap);
      }
    } else if (this.phase === 'finished') {
      // Gently coast car to a halt after crossing the finish gate
      this.vehicleState = stepVehiclePhysics(
        this.vehicleState,
        { throttle: 0, brake: 0.45, steer: 0 },
        this.track,
        this.colliders,
        dt,
      );
    }

    this.syncCarTransform();
    this.envBuild.updateDust(
      dt,
      this.vehicleState.x,
      this.vehicleState.y,
      this.vehicleState.z,
      this.vehicleState.heading,
      this.vehicleState.speed,
      this.vehicleState.isOffRoad,
      this.vehicleState.isDrifting,
    );
    this.updateCamera(dt);

    if (this.phase === 'running') {
      this.emitTelemetry(false);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.scheduleAfterDraw();
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private scheduleAfterDraw(): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(this.tick, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(this.tick, 80);
    }
  }

  private startLoop(): void {
    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(this.tick, 16);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    window.removeEventListener('orientationchange', this.onWindowResizeBound);
    window.visualViewport?.removeEventListener('resize', this.onWindowResizeBound);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.envBuild.dispose();
    this.carRig.dispose();
    this.envRT.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
