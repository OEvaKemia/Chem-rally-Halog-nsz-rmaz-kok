import * as THREE from 'three';

export function createGravelRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base warm crushed alpine gravel
  ctx.fillStyle = '#97856d';
  ctx.fillRect(0, 0, size, size);

  // Subtle compacted tire ruts along V (road direction)
  const drawTrackRut = (centerX: number, width: number, alpha: number) => {
    const grad = ctx.createLinearGradient(centerX - width, 0, centerX + width, 0);
    grad.addColorStop(0, 'rgba(98, 82, 62, 0)');
    grad.addColorStop(0.5, `rgba(88, 72, 54, ${alpha})`);
    grad.addColorStop(1, 'rgba(98, 82, 62, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(centerX - width, 0, width * 2, size);
  };
  drawTrackRut(size * 0.34, 46, 0.34);
  drawTrackRut(size * 0.66, 46, 0.34);

  // Shoulder edges (slightly darker looser gravel)
  const leftEdge = ctx.createLinearGradient(0, 0, 56, 0);
  leftEdge.addColorStop(0, 'rgba(72, 64, 52, 0.65)');
  leftEdge.addColorStop(1, 'rgba(72, 64, 52, 0)');
  ctx.fillStyle = leftEdge;
  ctx.fillRect(0, 0, 56, size);

  const rightEdge = ctx.createLinearGradient(size - 56, 0, size, 0);
  rightEdge.addColorStop(0, 'rgba(72, 64, 52, 0)');
  rightEdge.addColorStop(1, 'rgba(72, 64, 52, 0.65)');
  ctx.fillStyle = rightEdge;
  ctx.fillRect(size - 56, 0, 56, size);

  // Crushed stone speckles (tileable vertically)
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.8 + Math.random() * 2.2;
    const tone = Math.random();
    if (tone < 0.35) ctx.fillStyle = 'rgba(218, 204, 184, 0.38)';
    else if (tone < 0.72) ctx.fillStyle = 'rgba(115, 100, 82, 0.35)';
    else ctx.fillStyle = 'rgba(65, 56, 45, 0.32)';
    ctx.fillRect(x, y, r, r);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createTireTreadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1d1e22';
  ctx.fillRect(0, 0, size, size);

  // Diagonal rally gravel tread blocks so wheel spin is unmistakably visible
  ctx.fillStyle = '#2d3036';
  const rows = 16;
  const stepY = size / rows;
  for (let i = 0; i < rows; i++) {
    const y = i * stepY;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size * 0.45, y + stepY * 0.45);
    ctx.lineTo(size * 0.45, y + stepY * 0.8);
    ctx.lineTo(0, y + stepY * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size, y);
    ctx.lineTo(size * 0.55, y + stepY * 0.45);
    ctx.lineTo(size * 0.55, y + stepY * 0.8);
    ctx.lineTo(size, y + stepY * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createGateBannerTexture(
  title: string,
  subtitle: string,
  accentColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Dark slate backdrop
  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, width, height);

  // Checkered edges
  const cell = 32;
  for (let row = 0; row < height / cell; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#f4f4f5' : '#18181b';
      ctx.fillRect(col * cell, row * cell, cell, cell);
      ctx.fillRect(width - (col + 1) * cell, row * cell, cell, cell);
    }
  }

  // Accent stripe
  ctx.fillStyle = accentColor;
  ctx.fillRect(140, 22, width - 280, 14);
  ctx.fillRect(140, height - 36, width - 280, 14);

  // Bold title
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 88px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, height * 0.44);

  ctx.fillStyle = accentColor;
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, width / 2, height * 0.74);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createRallyPlateTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#ea580c';
  ctx.fillRect(0, 0, size, 52);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHEM RALLY', size / 2, 27);

  ctx.fillStyle = '#111827';
  ctx.font = '700 132px "Chakra Petch", sans-serif';
  ctx.fillText('07', size / 2, 162);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.48);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
