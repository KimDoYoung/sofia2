import type {
  CollageConfig,
  CollagePhotoItem,
  AspectRatio,
} from '../types/collageTypes';
import { getNormalizedSlots, getJustifiedLayout, getScatterLayout } from './collageLayouts';

export interface CanvasDimensions {
  width: number;
  height: number;
}

export const getCanvasDimensions = (aspectRatio: AspectRatio, baseSize = 2048): CanvasDimensions => {
  switch (aspectRatio) {
    case '1:1':
      return { width: baseSize, height: baseSize };
    case '4:5':
      return { width: Math.round(baseSize * 0.8), height: baseSize };
    case '3:4':
      return { width: Math.round(baseSize * 0.75), height: baseSize };
    case '9:16':
      return { width: Math.round(baseSize * (9 / 16)), height: baseSize };
    case '16:9':
      return { width: baseSize, height: Math.round(baseSize * (9 / 16)) };
    case '1:2':
      return { width: Math.round(baseSize * 0.5), height: baseSize };
    default:
      return { width: baseSize, height: baseSize };
  }
};

export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

const getOrientedCanvas = (img: HTMLImageElement, rotation = 0): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const rot = ((rotation % 360) + 360) % 360;

  if (rot === 90 || rot === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return canvas;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
};

const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) => {
  const imgW = img.width;
  const imgH = img.height;
  const targetRatio = dw / dh;
  const imgRatio = imgW / imgH;

  let sx = 0, sy = 0, sw = imgW, sh = imgH;
  if (imgRatio > targetRatio) {
    sw = imgH * targetRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / targetRatio;
    sy = (imgH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
};

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  config: CollageConfig,
  forceColor?: string,
) => {
  if (forceColor) {
    ctx.fillStyle = forceColor;
  } else if (config.bgStyle === 'gradient' && config.bgColor2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasH);
    gradient.addColorStop(0, config.bgColor || '#FFFFFF');
    gradient.addColorStop(1, config.bgColor2);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = config.bgColor || '#FFFFFF';
  }
  ctx.fillRect(0, 0, canvasW, canvasH);
};

const drawBottomText = (
  ctx: CanvasRenderingContext2D,
  config: CollageConfig,
  canvasW: number,
  canvasH: number,
  scale: number,
  outerPad: number,
  textAreaH: number,
) => {
  const textToRender =
    config.showText && config.customText && config.customText.trim() !== ''
      ? config.customText.trim()
      : '';
  if (!textToRender) return;

  ctx.save();
  ctx.fillStyle = isLightColor(config.bgColor) ? '#4B5563' : '#E5E7EB';

  let fontSize = Math.round(18 * scale);
  ctx.font = `600 ${fontSize}px sans-serif`;
  const maxTextWidth = canvasW - outerPad * 2 - 20 * scale;
  const textWidth = ctx.measureText(textToRender).width;
  if (textWidth > maxTextWidth && textWidth > 0) {
    fontSize = Math.max(10 * scale, Math.round(fontSize * (maxTextWidth / textWidth)));
    ctx.font = `600 ${fontSize}px sans-serif`;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(textToRender, canvasW / 2, canvasH - outerPad - textAreaH / 2);
  ctx.restore();
};

// ─── Polaroid frame rendering (shared by grid/tilt/scatter) ──────────────────

const drawPolaroidFrame = (
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  boxW: number,
  boxH: number,
  scale: number,
  config: CollageConfig,
  showCaption = false,
  captionText = '',
) => {
  // Instax-accurate proportions: side/top ≈ 6%, bottom ≈ 18% of photo width
  const pSide = Math.max(5 * scale, boxW * 0.055);
  const pTop = pSide;
  const pBottom = Math.max(12 * scale, boxW * 0.18);

  const photoW = boxW - pSide * 2;
  const photoH = boxH - pTop - pBottom;
  const left = -boxW / 2;
  const top = -boxH / 2;
  const radius = Math.min(3 * scale, boxW * 0.02);

  // White card background
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, left, top, boxW, boxH, radius);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Photo area
  ctx.save();
  drawRoundedRect(ctx, left + pSide, top + pTop, photoW, photoH, Math.max(0, radius - scale));
  ctx.clip();
  drawCoverImage(ctx, src, left + pSide, top + pTop, photoW, photoH);
  ctx.restore();

  // Subtle card border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = scale;
  drawRoundedRect(ctx, left, top, boxW, boxH, radius);
  ctx.stroke();

  // Caption in bottom white area
  if (showCaption && captionText.trim()) {
    const capY = top + pTop + photoH + pBottom / 2;
    const maxCapW = photoW * 0.9;
    let capFontSize = Math.round(Math.min(13 * scale, pBottom * 0.45));

    ctx.fillStyle = '#555555';
    ctx.font = `${capFontSize}px cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shrink if too wide
    const capW = ctx.measureText(captionText.trim()).width;
    if (capW > maxCapW && capW > 0) {
      capFontSize = Math.max(8 * scale, Math.round(capFontSize * (maxCapW / capW)));
      ctx.font = `${capFontSize}px cursive`;
    }
    ctx.fillText(captionText.trim(), left + boxW / 2, capY);
  }
};

// ─── Mosaic (justified) mode ──────────────────────────────────────────────────

const renderMosaic = (
  ctx: CanvasRenderingContext2D,
  items: CollagePhotoItem[],
  loadedCanvases: HTMLCanvasElement[],
  config: CollageConfig,
  canvasW: number,
  canvasH: number,
  scale: number,
) => {
  const outerPad = config.outerPadding * scale;
  const gap = config.gap * scale;
  const textAreaH = config.showText && config.customText?.trim() ? 48 * scale : 0;
  const availW = canvasW - outerPad * 2;
  const availH = canvasH - outerPad * 2 - textAreaH;

  const aspectRatios = loadedCanvases.map(c => c.width / Math.max(c.height, 1));
  const slots = getJustifiedLayout(aspectRatios, availW, availH, gap);

  for (let i = 0; i < items.length; i++) {
    const slot = slots[i];
    if (!slot) continue;
    const src = loadedCanvases[i];

    const x = outerPad + slot.x;
    const y = outerPad + slot.y;
    const { w, h } = slot;
    const radius = config.borderRadius * scale;

    ctx.save();

    if (config.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
      ctx.shadowBlur = 14 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4 * scale;
    }

    ctx.fillStyle = config.bgColor || '#FFFFFF';
    drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.clip();
    // Draw image to fill slot exactly — justified layout preserves aspect ratio
    ctx.drawImage(src, x, y, w, h);
    ctx.restore();

    if (config.frameStyle === 'simple' && config.borderWidth > 0) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = config.borderWidth * scale;
      drawRoundedRect(ctx, x, y, w, h, radius);
      ctx.stroke();
    }

    ctx.restore();
  }
};

// ─── Scatter mode ─────────────────────────────────────────────────────────────

const renderScatter = (
  ctx: CanvasRenderingContext2D,
  items: CollagePhotoItem[],
  loadedCanvases: HTMLCanvasElement[],
  config: CollageConfig,
  canvasW: number,
  canvasH: number,
  scale: number,
) => {
  const outerPad = config.outerPadding * scale;
  const availW = canvasW - outerPad * 2;
  const availH = canvasH - outerPad * 2;

  // Seed from item ordering so handleShufflePhotos changes layout
  const seed = items.reduce((acc, item, i) => acc + item.id * (i + 1), 0);
  const scatterItems = getScatterLayout(items.length, availW, availH, seed);

  // Render back to front (index 0 is bottom layer)
  for (let i = 0; i < items.length; i++) {
    const sc = scatterItems[i];
    const src = loadedCanvases[i];
    const item = items[i];

    const ar = src.width / Math.max(src.height, 1);
    const photoW = sc.size;
    const photoH = photoW / ar;

    // Combine scatter base angle with per-photo tilt
    const totalAngle = sc.angle + item.tiltAngle * (config.tiltIntensity / 4);
    const cx = outerPad + sc.cx;
    const cy = outerPad + sc.cy;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((totalAngle * Math.PI) / 180);

    if (config.frameStyle === 'polaroid') {
      if (config.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 22 * scale;
        ctx.shadowOffsetX = 3 * scale;
        ctx.shadowOffsetY = 9 * scale;
      }
      drawPolaroidFrame(
        ctx, src, photoW, photoH, scale, config,
        config.showText,
        config.customText,
      );
    } else {
      const radius = config.borderRadius * scale;
      const left = -photoW / 2;
      const top = -photoH / 2;

      if (config.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
        ctx.shadowBlur = 18 * scale;
        ctx.shadowOffsetX = 2 * scale;
        ctx.shadowOffsetY = 7 * scale;
      }

      ctx.fillStyle = config.bgColor || '#FFFFFF';
      drawRoundedRect(ctx, left, top, photoW, photoH, radius);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.save();
      drawRoundedRect(ctx, left, top, photoW, photoH, radius);
      ctx.clip();
      drawCoverImage(ctx, src, left, top, photoW, photoH);
      ctx.restore();

      if (config.frameStyle === 'simple' && config.borderWidth > 0) {
        ctx.strokeStyle = config.borderColor;
        ctx.lineWidth = config.borderWidth * scale;
        drawRoundedRect(ctx, left, top, photoW, photoH, radius);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
};

// ─── Filmstrip mode ───────────────────────────────────────────────────────────

const renderFilmstrip = (
  ctx: CanvasRenderingContext2D,
  items: CollagePhotoItem[],
  loadedCanvases: HTMLCanvasElement[],
  config: CollageConfig,
  canvasW: number,
  canvasH: number,
  scale: number,
) => {
  const gap = Math.max(3 * scale, config.gap * scale * 0.5);
  const sprocketW = Math.round(canvasW * 0.075);
  const sprocketHoleR = Math.round(sprocketW * 0.28);
  const photoAreaX = sprocketW;
  const photoAreaW = canvasW - sprocketW * 2;
  const count = items.length;
  const slotH = (canvasH - gap * (count + 1)) / count;

  // Sprocket side areas
  ctx.fillStyle = '#1C1C1C';
  ctx.fillRect(0, 0, sprocketW, canvasH);
  ctx.fillRect(canvasW - sprocketW, 0, sprocketW, canvasH);

  // Film frame separator lines
  ctx.strokeStyle = '#3A3A3A';
  ctx.lineWidth = scale;
  ctx.strokeRect(sprocketW, 0, photoAreaW, canvasH);

  // Sprocket holes + frame numbers + photos
  for (let i = 0; i < count; i++) {
    const frameY = gap + i * (slotH + gap);
    const holeCount = Math.max(2, Math.round(slotH / (sprocketHoleR * 4)));
    const holeSpacing = slotH / holeCount;

    // Sprocket holes on both sides
    ctx.fillStyle = '#0A0A0A';
    for (let h = 0; h < holeCount; h++) {
      const hy = frameY + holeSpacing * (h + 0.5);
      ctx.beginPath();
      ctx.arc(sprocketW / 2, hy, sprocketHoleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(canvasW - sprocketW / 2, hy, sprocketHoleR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Frame number (amber like real film)
    ctx.fillStyle = 'rgba(255, 210, 80, 0.75)';
    const numFontSize = Math.max(8, Math.round(9 * scale));
    ctx.font = `bold ${numFontSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${String(i + 1).padStart(2, '0')}A`, photoAreaX + 3 * scale, frameY + 2 * scale);

    // Photo
    const src = loadedCanvases[i];
    if (!src) continue;
    const photoX = photoAreaX + gap;
    const photoW = photoAreaW - gap * 2;
    const photoH = slotH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, frameY, photoW, photoH);
    ctx.clip();
    drawCoverImage(ctx, src, photoX, frameY, photoW, photoH);
    ctx.restore();

    // Frame border
    ctx.strokeStyle = '#2E2E2E';
    ctx.lineWidth = scale;
    ctx.strokeRect(photoX, frameY, photoW, photoH);
  }

  // Bottom text in amber mono font
  if (config.showText && config.customText?.trim()) {
    const txt = config.customText.trim();
    const fontSize = Math.max(10, Math.round(11 * scale));
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = 'rgba(255, 210, 80, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(txt, canvasW / 2, canvasH - 3 * scale);
  }
};

// ─── Main render function ─────────────────────────────────────────────────────

export const renderCollageToCanvas = async (
  canvas: HTMLCanvasElement,
  items: CollagePhotoItem[],
  config: CollageConfig,
  targetWidth = 2048,
  cachedCanvases?: Map<number, HTMLCanvasElement>
) => {
  const { width: canvasW, height: canvasH } = getCanvasDimensions(config.aspectRatio, targetWidth);
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  const filmstripBg = config.mode === 'filmstrip' ? '#111111' : undefined;
  drawBackground(ctx, canvasW, canvasH, config, filmstripBg);

  if (items.length === 0) return;

  // Load / cache images
  const loadedCanvases: HTMLCanvasElement[] = await Promise.all(
    items.map(async (item) => {
      if (cachedCanvases && cachedCanvases.has(item.id)) {
        return cachedCanvases.get(item.id)!;
      }
      const img = await loadImage(item.url);
      const oriented = getOrientedCanvas(img, item.rotationAngle || 0);
      if (cachedCanvases) {
        cachedCanvases.set(item.id, oriented);
      }
      return oriented;
    })
  );

  const scale = canvasW / 600;

  // ── New modes ──
  if (config.mode === 'mosaic') {
    renderMosaic(ctx, items, loadedCanvases, config, canvasW, canvasH, scale);
    const outerPad = config.outerPadding * scale;
    const textAreaH = config.showText && config.customText?.trim() ? 48 * scale : 0;
    drawBottomText(ctx, config, canvasW, canvasH, scale, outerPad, textAreaH);
    return;
  }

  if (config.mode === 'scatter') {
    renderScatter(ctx, items, loadedCanvases, config, canvasW, canvasH, scale);
    if (config.frameStyle !== 'polaroid') {
      const outerPad = config.outerPadding * scale;
      const textAreaH = config.showText && config.customText?.trim() ? 48 * scale : 0;
      drawBottomText(ctx, config, canvasW, canvasH, scale, outerPad, textAreaH);
    }
    return;
  }

  if (config.mode === 'filmstrip') {
    renderFilmstrip(ctx, items, loadedCanvases, config, canvasW, canvasH, scale);
    return;
  }

  // ── Existing grid / tilt / photobooth ──
  const slots = getNormalizedSlots(items.length, config.mode, config.templateIndex);

  const outerPad = config.outerPadding * scale;
  const gap = config.gap * scale;

  const textToRender =
    config.showText && config.customText && config.customText.trim() !== ''
      ? config.customText.trim()
      : '';
  const dateAreaH = textToRender ? 48 * scale : 0;
  const availW = canvasW - outerPad * 2;
  const availH = canvasH - outerPad * 2 - dateAreaH;

  for (let i = 0; i < items.length; i++) {
    const slot = slots[i] || { x: 0, y: 0, width: 1, height: 1 };
    const item = items[i];
    const sourceCanvas = loadedCanvases[i];
    if (!sourceCanvas) continue;

    const halfGap = gap / 2;
    const sx = outerPad + slot.x * availW + (slot.x > 0 ? halfGap : 0);
    const sy = outerPad + slot.y * availH + (slot.y > 0 ? halfGap : 0);
    const sw = slot.width * availW - (slot.x > 0 && slot.x + slot.width < 1 ? gap : halfGap * (slot.width < 1 ? 1 : 0));
    const sh = slot.height * availH - (slot.y > 0 && slot.y + slot.height < 1 ? gap : halfGap * (slot.height < 1 ? 1 : 0));

    const cx = sx + sw / 2;
    const cy = sy + sh / 2;

    ctx.save();
    ctx.translate(cx, cy);

    const effectiveTilt = config.mode === 'tilt' ? (item.tiltAngle * (config.tiltIntensity / 4)) : 0;
    if (effectiveTilt !== 0) {
      ctx.rotate((effectiveTilt * Math.PI) / 180);
    }

    if (config.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
      ctx.shadowBlur = 16 * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 6 * scale;
    }

    const boxW = sw;
    const boxH = sh;
    const radius = config.borderRadius * scale;

    if (config.frameStyle === 'polaroid') {
      // Grid/tilt/photobooth: no per-card caption; bottom text rendered at canvas level
      drawPolaroidFrame(ctx, sourceCanvas, boxW, boxH, scale, config, false, '');
    } else {
      const left = -boxW / 2;
      const top = -boxH / 2;

      ctx.fillStyle = config.bgColor || '#FFFFFF';
      drawRoundedRect(ctx, left, top, boxW, boxH, radius);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.save();
      drawRoundedRect(ctx, left, top, boxW, boxH, radius);
      ctx.clip();
      drawCoverImage(ctx, sourceCanvas, left, top, boxW, boxH);
      ctx.restore();

      if (config.frameStyle === 'simple' && config.borderWidth > 0) {
        ctx.strokeStyle = config.borderColor || '#000000';
        ctx.lineWidth = config.borderWidth * scale;
        drawRoundedRect(ctx, left, top, boxW, boxH, radius);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawBottomText(ctx, config, canvasW, canvasH, scale, outerPad, dateAreaH);
};

const isLightColor = (hex = '#FFFFFF') => {
  const color = hex.replace('#', '');
  if (color.length < 6) return true;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
};

export const downloadCanvasImage = (
  canvas: HTMLCanvasElement,
  filename = 'sofia_collage.jpg',
  quality = 0.95
) => {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};
