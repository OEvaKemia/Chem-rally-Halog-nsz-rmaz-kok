import { RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Molecule3DModel } from '../../game/chemistry/checkpointData';

interface Molecule3DViewerProps {
  model: Molecule3DModel;
}

function detectSoftwareGl(): boolean {
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

export function Molecule3DViewer({ model }: Molecule3DViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const molGroupRef = useRef<THREE.Group | null>(null);
  const rotTargetRef = useRef({ x: 0.35, y: 0.45 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const userInteractedRef = useRef(false);

  // Build & manage Three.js scene once
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const isSoftware = detectSoftwareGl();
    const width = host.clientWidth || 320;
    const height = host.clientHeight || 200;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftware,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / Math.max(1, height), 0.1, 100);
    camera.position.set(0, 0.3, 10.2);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x27272a, 0.9);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff7ed, 2.0);
    key.position.set(5, 7, 6);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x93c5fd, 0.8);
    rim.position.set(-5, -3, -4);
    scene.add(rim);

    const molGroup = new THREE.Group();
    scene.add(molGroup);
    molGroupRef.current = molGroup;

    const resizeObserver = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(host);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!isDraggingRef.current && !userInteractedRef.current) {
        rotTargetRef.current.y += dt * 0.45;
      }

      molGroup.rotation.x = THREE.MathUtils.damp(
        molGroup.rotation.x,
        rotTargetRef.current.x,
        12,
        dt,
      );
      molGroup.rotation.y = THREE.MathUtils.damp(
        molGroup.rotation.y,
        rotTargetRef.current.y,
        12,
        dt,
      );

      renderer.render(scene, camera);

      if (isSoftware) {
        frameId = window.setTimeout(tick, 80);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      molGroupRef.current = null;
    };
  }, []);

  // Populate / swap molecule geometry when model changes
  useEffect(() => {
    const group = molGroupRef.current;
    if (!group) return;

    const disposables: Array<{ dispose: () => void }> = [];
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const cGeo = new THREE.SphereGeometry(0.35, 22, 16);
    const hGeo = new THREE.SphereGeometry(0.21, 16, 12);
    const brGeo = new THREE.SphereGeometry(0.49, 24, 18);
    const bondGeo = new THREE.CylinderGeometry(0.085, 0.085, 1, 12);

    const cMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.35,
      metalness: 0.15,
    });
    const hMat = new THREE.MeshStandardMaterial({
      color: 0xf4f4f5,
      roughness: 0.4,
      metalness: 0.05,
    });
    const brMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Vörösesbarna / élénk bróm CPK szín
      roughness: 0.28,
      metalness: 0.18,
    });
    const bondMat = new THREE.MeshStandardMaterial({
      color: 0xa1a1aa,
      roughness: 0.45,
      metalness: 0.45,
    });

    disposables.push(cGeo, hGeo, brGeo, bondGeo, cMat, hMat, brMat, bondMat);

    for (const atom of model.atoms) {
      const geo = atom.element === 'Br' ? brGeo : atom.element === 'H' ? hGeo : cGeo;
      const mat = atom.element === 'Br' ? brMat : atom.element === 'H' ? hMat : cMat;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(atom.x, atom.y, atom.z);
      group.add(mesh);
    }

    const up = new THREE.Vector3(0, 1, 0);
    const aPos = new THREE.Vector3();
    const bPos = new THREE.Vector3();
    const dir = new THREE.Vector3();

    for (const bond of model.bonds) {
      const a = model.atoms[bond.from];
      const b = model.atoms[bond.to];
      aPos.set(a.x, a.y, a.z);
      bPos.set(b.x, b.y, b.z);
      dir.subVectors(bPos, aPos);
      const len = dir.length();
      const cyl = new THREE.Mesh(bondGeo, bondMat);
      cyl.position.copy(aPos).addScaledVector(dir, 0.5);
      cyl.scale.set(1, len, 1);
      cyl.quaternion.setFromUnitVectors(up, dir.normalize());
      group.add(cyl);
    }

    rotTargetRef.current = { x: 0.32, y: 0.4 };
    userInteractedRef.current = false;

    return () => {
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }
      for (const d of disposables) {
        d.dispose();
      }
    };
  }, [model]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if unsupported
    }
    isDraggingRef.current = true;
    userInteractedRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    rotTargetRef.current.y += dx * 0.012;
    rotTargetRef.current.x = Math.max(
      -1.4,
      Math.min(1.4, rotTargetRef.current.x + dy * 0.012),
    );
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleResetView = () => {
    rotTargetRef.current = { x: 0.32, y: 0.4 };
    userInteractedRef.current = false;
  };

  return (
    <div className="relative h-44 sm:h-56 w-full overflow-hidden rounded-xl border border-white/15 bg-zinc-900/90">
      <div
        ref={hostRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        className="touch-control h-full w-full cursor-grab active:cursor-grabbing"
        aria-label="Forgatható 3D molekulamodell"
      />

      <div className="pointer-events-none absolute left-2.5 top-2 text-[11px] font-medium text-zinc-300">
        Húzd az ujjaddal vagy egérrel a forgatáshoz
      </div>

      <button
        type="button"
        onClick={handleResetView}
        className="absolute right-2 top-2 flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-zinc-950/80 px-2 text-[11px] font-medium text-zinc-200 hover:bg-zinc-800"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Alap</span>
      </button>

      {/* CPK atomjelmagyarázat */}
      <div className="pointer-events-none absolute bottom-2 left-2.5 flex items-center gap-3 text-[11px] text-zinc-300">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-700 border border-zinc-400" />
          C
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-100" />
          H
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-red-700 border border-red-400" />
          Br
        </span>
      </div>
    </div>
  );
}
