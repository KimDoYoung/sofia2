import type {
  CollageConfig,
  CollagePhotoItem,
  AspectRatio,
} from '../types/collageTypes';
import { getNormalizedSlots } from './collageLayouts';

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

/**
 * HTMLImageElement 로드 (crossOrigin 지원)
 */
export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

/**
 * 90도 단위 회전이 적용된 오프스크린 이미지 캔버스 생성
 */
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

/**
 * 둥근 사각형 그리기 헬퍼 (Path2D or ctx.roundRect fallback)
 */
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

/**
 * 콜라쥬를 지정된 Canvas에 렌더링하는 메인 함수
 */
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

  // 1. 배경 칠하기
  ctx.fillStyle = config.bgColor || '#FFFFFF';
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (items.length === 0) return;

  // 2. 슬롯 계산
  const slots = getNormalizedSlots(items.length, config.mode, config.templateIndex);

  // 스케일 팩터 (2048 기준 UI 슬라이더 값 스케일)
  const scale = canvasW / 600;
  const outerPad = config.outerPadding * scale;
  const gap = config.gap * scale;
  const radius = config.borderRadius * scale;

  // 하단 텍스트 여백
  const textToRender =
    config.showText && config.customText && config.customText.trim() !== ''
      ? config.customText.trim()
      : '';
  const dateAreaH = textToRender ? 48 * scale : 0;
  const availW = canvasW - outerPad * 2;
  const availH = canvasH - outerPad * 2 - dateAreaH;

  // 3. 이미지 로드 (캐시 우선 활용)
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

  // 4. 각 슬롯 렌더링
  for (let i = 0; i < items.length; i++) {
    const slot = slots[i] || { x: 0, y: 0, width: 1, height: 1 };
    const item = items[i];
    const sourceCanvas = loadedCanvases[i];
    if (!sourceCanvas) continue;

    // 슬롯의 픽셀 좌표 및 크기
    const halfGap = gap / 2;
    const sx = outerPad + slot.x * availW + (slot.x > 0 ? halfGap : 0);
    const sy = outerPad + slot.y * availH + (slot.y > 0 ? halfGap : 0);
    const sw = slot.width * availW - (slot.x > 0 && slot.x + slot.width < 1 ? gap : halfGap * (slot.width < 1 ? 1 : 0));
    const sh = slot.height * availH - (slot.y > 0 && slot.y + slot.height < 1 ? gap : halfGap * (slot.height < 1 ? 1 : 0));

    // 중심점
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // 미세 틸트 (약간의 회전)
    const effectiveTilt = config.mode === 'tilt' ? (item.tiltAngle * (config.tiltIntensity / 4)) : 0;
    if (effectiveTilt !== 0) {
      ctx.rotate((effectiveTilt * Math.PI) / 180);
    }

    // 그림자 설정
    if (config.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
      ctx.shadowBlur = 16 * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 6 * scale;
    }

    const boxW = sw;
    const boxH = sh;
    const left = -boxW / 2;
    const top = -boxH / 2;

    if (config.frameStyle === 'polaroid') {
      // 폴라로이드 프레임
      const pBorder = Math.max(6 * scale, boxW * 0.04);
      const pBottom = pBorder * 2.8; // 하단 넓은 여백

      // 1) 흰색 카드 배경 + 그림자
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, left, top, boxW, boxH, radius);
      ctx.fill();

      // 그림자 리셋 후 사진 그리기
      ctx.shadowColor = 'transparent';

      // 2) 사진 영역 클리핑
      const photoX = left + pBorder;
      const photoY = top + pBorder;
      const photoW = boxW - pBorder * 2;
      const photoH = boxH - pBorder - pBottom;

      ctx.save();
      drawRoundedRect(ctx, photoX, photoY, photoW, photoH, Math.max(0, radius - 2 * scale));
      ctx.clip();

      // Cover 모드로 사진 그리기
      drawCoverImage(ctx, sourceCanvas, photoX, photoY, photoW, photoH);
      ctx.restore();

      // 은은한 폴라로이드 테두리선
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1 * scale;
      drawRoundedRect(ctx, left, top, boxW, boxH, radius);
      ctx.stroke();

    } else {
      // 일반 / 심플 프레임
      // 그림자 적용을 위해 배경 채우기
      ctx.fillStyle = config.bgColor || '#FFFFFF';
      drawRoundedRect(ctx, left, top, boxW, boxH, radius);
      ctx.fill();

      // 그림자 리셋
      ctx.shadowColor = 'transparent';

      // 사진 그리기 클리핑
      ctx.save();
      drawRoundedRect(ctx, left, top, boxW, boxH, radius);
      ctx.clip();
      drawCoverImage(ctx, sourceCanvas, left, top, boxW, boxH);
      ctx.restore();

      // 심플 보더가 설정된 경우 테두리 그리기
      if (config.frameStyle === 'simple' && config.borderWidth > 0) {
        ctx.strokeStyle = config.borderColor || '#000000';
        ctx.lineWidth = config.borderWidth * scale;
        drawRoundedRect(ctx, left, top, boxW, boxH, radius);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // 5. 하단 사용자 지정/감성 텍스트 표시
  if (textToRender) {
    ctx.save();
    ctx.fillStyle = isLightColor(config.bgColor) ? '#4B5563' : '#E5E7EB';

    // 텍스트 길이에 맞춘 폰트 크기 자동 조절
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
    ctx.fillText(textToRender, canvasW / 2, canvasH - outerPad - dateAreaH / 2);
    ctx.restore();
  }
};

/**
 * 이미지를 지정 영역에 Cover 비율로 그리기
 */
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

  let sx = 0;
  let sy = 0;
  let sw = imgW;
  let sh = imgH;

  if (imgRatio > targetRatio) {
    sw = imgH * targetRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / targetRatio;
    sy = (imgH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
};

const isLightColor = (hex = '#FFFFFF') => {
  const color = hex.replace('#', '');
  if (color.length < 6) return true;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
};

/**
 * 캔버스 이미지를 JPG/PNG로 다운로드
 */
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
