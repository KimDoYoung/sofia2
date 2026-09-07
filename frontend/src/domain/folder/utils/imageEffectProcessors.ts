import type {
  EffectType,
  EffectParamsMap,
  OilParams,
  WatercolorParams,
  CrystallizeParams,
  PointillizeParams,
  MarbleParams,
  KaleidoscopeParams,
  TwirlParams,
  RippleParams,
  BlurParams,
  FlareParams,
  SolarizeParams,
  CrossStitchParams,
  AsciiParams,
  ThermalParams,
  AnaglyphParams,
  SketchParams,
  VignetteParams,
  GrainParams,
} from '../types/effectTypes';

/**
 * 픽셀 좌표 클램프 헬퍼
 */
const clamp = (val: number, min: number, max: number): number => {
  return val < min ? min : val > max ? max : val;
};

/**
 * 빠른 선형 보간 (Bilinear Interpolation) 샘플링
 */
const sampleBilinear = (
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number
): [number, number, number, number] => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);

  const fx = x - x0;
  const fy = y - y0;

  const cx0 = clamp(x0, 0, w - 1);
  const cy0 = clamp(y0, 0, h - 1);

  const idx00 = (cy0 * w + cx0) * 4;
  const idx10 = (cy0 * w + x1) * 4;
  const idx01 = (y1 * w + cx0) * 4;
  const idx11 = (y1 * w + x1) * 4;

  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;

  const r = data[idx00] * w00 + data[idx10] * w10 + data[idx01] * w01 + data[idx11] * w11;
  const g = data[idx00 + 1] * w00 + data[idx10 + 1] * w10 + data[idx01 + 1] * w01 + data[idx11 + 1] * w11;
  const b = data[idx00 + 2] * w00 + data[idx10 + 2] * w10 + data[idx01 + 2] * w01 + data[idx11 + 2] * w11;
  const a = data[idx00 + 3] * w00 + data[idx10 + 3] * w10 + data[idx01 + 3] * w01 + data[idx11 + 3] * w11;

  return [r, g, b, a];
};

// ─────────────────────────────────────────────────────────────
// 1. 유화 (Oil Painting)
// ─────────────────────────────────────────────────────────────
export const applyOilPainting = (
  srcData: ImageData,
  params: OilParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { radius: r, levels } = params;

  const intensityCount = new Int32Array(levels);
  const avgR = new Int32Array(levels);
  const avgG = new Int32Array(levels);
  const avgB = new Int32Array(levels);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      intensityCount.fill(0);
      avgR.fill(0);
      avgG.fill(0);
      avgB.fill(0);

      const yMin = Math.max(0, y - r);
      const yMax = Math.min(h - 1, y + r);
      const xMin = Math.max(0, x - r);
      const xMax = Math.min(w - 1, x + r);

      for (let ny = yMin; ny <= yMax; ny++) {
        for (let nx = xMin; nx <= xMax; nx++) {
          const sIdx = (ny * w + nx) * 4;
          const sr = src[sIdx];
          const sg = src[sIdx + 1];
          const sb = src[sIdx + 2];

          const curIntensity = Math.floor(((sr + sg + sb) / 3 * levels) / 256);
          const iBin = Math.min(levels - 1, Math.max(0, curIntensity));

          intensityCount[iBin]++;
          avgR[iBin] += sr;
          avgG[iBin] += sg;
          avgB[iBin] += sb;
        }
      }

      let maxCount = 0;
      let maxIndex = 0;
      for (let i = 0; i < levels; i++) {
        if (intensityCount[i] > maxCount) {
          maxCount = intensityCount[i];
          maxIndex = i;
        }
      }

      const dIdx = (y * w + x) * 4;
      if (maxCount > 0) {
        dst[dIdx] = Math.round(avgR[maxIndex] / maxCount);
        dst[dIdx + 1] = Math.round(avgG[maxIndex] / maxCount);
        dst[dIdx + 2] = Math.round(avgB[maxIndex] / maxCount);
      } else {
        dst[dIdx] = src[dIdx];
        dst[dIdx + 1] = src[dIdx + 1];
        dst[dIdx + 2] = src[dIdx + 2];
      }
      dst[dIdx + 3] = src[dIdx + 3];
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 2. 수채화 (Watercolor)
// ─────────────────────────────────────────────────────────────
export const applyWatercolor = (
  srcData: ImageData,
  params: WatercolorParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { smoothness, edgeStrength } = params;
  const r = Math.max(1, smoothness);

  // Kuwahara Filter
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 4 Quadrants
      let minVariance = Infinity;
      let bestR = 0, bestG = 0, bestB = 0;

      const quads = [
        [-r, 0, -r, 0], // Top-Left
        [0, r, -r, 0],  // Top-Right
        [-r, 0, 0, r],  // Bottom-Left
        [0, r, 0, r],   // Bottom-Right
      ];

      for (let q = 0; q < 4; q++) {
        const [x0, x1, y0, y1] = quads[q];
        let count = 0;
        let sumR = 0, sumG = 0, sumB = 0;
        let sumSqR = 0, sumSqG = 0, sumSqB = 0;

        for (let dy = y0; dy <= y1; dy++) {
          const ny = clamp(y + dy, 0, h - 1);
          for (let dx = x0; dx <= x1; dx++) {
            const nx = clamp(x + dx, 0, w - 1);
            const idx = (ny * w + nx) * 4;
            const pr = src[idx];
            const pg = src[idx + 1];
            const pb = src[idx + 2];

            sumR += pr;
            sumG += pg;
            sumB += pb;
            sumSqR += pr * pr;
            sumSqG += pg * pg;
            sumSqB += pb * pb;
            count++;
          }
        }

        if (count > 0) {
          const meanR = sumR / count;
          const meanG = sumG / count;
          const meanB = sumB / count;
          const varR = sumSqR / count - meanR * meanR;
          const varG = sumSqG / count - meanG * meanG;
          const varB = sumSqB / count - meanB * meanB;
          const totalVar = varR + varG + varB;

          if (totalVar < minVariance) {
            minVariance = totalVar;
            bestR = meanR;
            bestG = meanG;
            bestB = meanB;
          }
        }
      }

      const dIdx = (y * w + x) * 4;
      dst[dIdx] = Math.round(bestR);
      dst[dIdx + 1] = Math.round(bestG);
      dst[dIdx + 2] = Math.round(bestB);
      dst[dIdx + 3] = src[dIdx + 3];
    }
  }

  // Sobel Edge Overlay
  if (edgeStrength > 0) {
    const factor = (edgeStrength / 100) * 1.5;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const top = ((y - 1) * w + x) * 4;
        const btm = ((y + 1) * w + x) * 4;
        const lft = (y * w + (x - 1)) * 4;
        const rgt = (y * w + (x + 1)) * 4;

        const gx = Math.abs(src[rgt] - src[lft]) + Math.abs(src[rgt + 1] - src[lft + 1]) + Math.abs(src[rgt + 2] - src[lft + 2]);
        const gy = Math.abs(src[btm] - src[top]) + Math.abs(src[btm + 1] - src[top + 1]) + Math.abs(src[btm + 2] - src[top + 2]);
        const edge = Math.min(255, (gx + gy) * factor * 0.5);

        if (edge > 20) {
          const dark = (255 - edge) / 255;
          dst[idx] = Math.round(dst[idx] * dark);
          dst[idx + 1] = Math.round(dst[idx + 1] * dark);
          dst[idx + 2] = Math.round(dst[idx + 2] * dark);
        }
      }
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 3. 스테인드글라스 / 보로노이 (Crystallize)
// ─────────────────────────────────────────────────────────────
export const applyCrystallize = (
  srcData: ImageData,
  params: CrystallizeParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { cellSize, borderWidth } = params;

  const cols = Math.ceil(w / cellSize) + 1;
  const rows = Math.ceil(h / cellSize) + 1;

  // 보로노이 시드 포인트 생성 (지터링)
  const seedX: number[] = [];
  const seedY: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jx = (Math.sin(c * 17.1 + r * 31.7) * 0.5 + 0.5) * cellSize;
      const jy = (Math.cos(c * 23.3 + r * 41.2) * 0.5 + 0.5) * cellSize;
      seedX.push(clamp(c * cellSize + jx, 0, w - 1));
      seedY.push(clamp(r * cellSize + jy, 0, h - 1));
    }
  }

  // 픽셀 할당 및 보로노이 테두리 계산
  const searchRadius = 2;
  for (let y = 0; y < h; y++) {
    const gridY = Math.floor(y / cellSize);
    for (let x = 0; x < w; x++) {
      const gridX = Math.floor(x / cellSize);

      let d1 = Infinity;
      let d2 = Infinity;
      let bestSx = 0;
      let bestSy = 0;

      for (let ry = -searchRadius; ry <= searchRadius; ry++) {
        const gy = gridY + ry;
        if (gy < 0 || gy >= rows) continue;
        for (let rx = -searchRadius; rx <= searchRadius; rx++) {
          const gx = gridX + rx;
          if (gx < 0 || gx >= cols) continue;

          const sIdx = gy * cols + gx;
          const sx = seedX[sIdx];
          const sy = seedY[sIdx];
          const dist = Math.hypot(x - sx, y - sy);

          if (dist < d1) {
            d2 = d1;
            d1 = dist;
            bestSx = sx;
            bestSy = sy;
          } else if (dist < d2) {
            d2 = dist;
          }
        }
      }

      const dIdx = (y * w + x) * 4;
      // 납 테두리선 (Lead Border)
      if (borderWidth > 0 && d2 - d1 < borderWidth) {
        dst[dIdx] = 30;
        dst[dIdx + 1] = 32;
        dst[dIdx + 2] = 36;
      } else {
        // 시드 포인트의 색상 채우기
        const sPixIdx = (Math.floor(bestSy) * w + Math.floor(bestSx)) * 4;
        dst[dIdx] = src[sPixIdx];
        dst[dIdx + 1] = src[sPixIdx + 1];
        dst[dIdx + 2] = src[sPixIdx + 2];
      }
      dst[dIdx + 3] = 255;
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 4. 점묘화 (Pointillize)
// ─────────────────────────────────────────────────────────────
export const applyPointillize = (
  srcData: ImageData,
  params: PointillizeParams,
  canvas: HTMLCanvasElement
): void => {
  const { width: w, height: h, data: src } = srcData;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = w;
  canvas.height = h;

  // 은은한 크림색 캔버스 배경
  ctx.fillStyle = '#FAF7EE';
  ctx.fillRect(0, 0, w, h);

  const { dotSize, density } = params;
  const step = Math.max(2, Math.round(dotSize * 0.75));
  const chance = density / 100;
  const radius = dotSize / 2;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (Math.random() > chance) continue;

      const jx = (Math.random() - 0.5) * step * 0.8;
      const jy = (Math.random() - 0.5) * step * 0.8;
      const px = clamp(Math.round(x + jx), 0, w - 1);
      const py = clamp(Math.round(y + jy), 0, h - 1);

      const sIdx = (py * w + px) * 4;
      const r = src[sIdx];
      const g = src[sIdx + 1];
      const b = src[sIdx + 2];
      const a = src[sIdx + 3] / 255;

      const rDot = radius * (0.8 + Math.random() * 0.4);

      ctx.beginPath();
      ctx.arc(px, py, rDot, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a * 0.88})`;
      ctx.fill();
    }
  }
};

// ─────────────────────────────────────────────────────────────
// 5. 마블링 & 목판화 (Wood / Marble Texture)
// ─────────────────────────────────────────────────────────────
export const applyMarble = (
  srcData: ImageData,
  params: MarbleParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { turbulence, palette } = params;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 펄린 느낌의 복합 사인파 난류 (Turbulence)
      const noise =
        Math.sin(x * 0.02 + y * 0.015) * 0.5 +
        Math.sin(x * 0.05 - y * 0.04) * 0.3 +
        Math.sin((x + y) * 0.08) * 0.2;

      const wave = Math.sin(x * 0.01 + noise * turbulence * 1.8);
      const offset = wave * turbulence * 6;

      const sx = clamp(x + offset, 0, w - 1);
      const sy = clamp(y + offset * 0.5, 0, h - 1);

      const [r, g, b, a] = sampleBilinear(src, w, h, sx, sy);
      const dIdx = (y * w + x) * 4;

      if (palette === 'wood') {
        // 따뜻한 목판화 톤
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        dst[dIdx] = Math.round(lum * 190 + 35);
        dst[dIdx + 1] = Math.round(lum * 135 + 20);
        dst[dIdx + 2] = Math.round(lum * 80 + 10);
      } else {
        // 대리석 질감
        const vein = Math.abs(Math.sin((x + y * 0.7) * 0.02 + noise * 4));
        const factor = 0.8 + vein * 0.3;
        dst[dIdx] = clamp(Math.round(r * factor), 0, 255);
        dst[dIdx + 1] = clamp(Math.round(g * factor), 0, 255);
        dst[dIdx + 2] = clamp(Math.round(b * factor), 0, 255);
      }
      dst[dIdx + 3] = a;
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 6. 만화경 (Kaleidoscope)
// ─────────────────────────────────────────────────────────────
export const applyKaleidoscope = (
  srcData: ImageData,
  params: KaleidoscopeParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { facets, angle } = params;

  const cx = w / 2;
  const cy = h / 2;
  const sector = (2 * Math.PI) / facets;
  const baseAngle = (angle * Math.PI) / 180;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);

      let theta = Math.atan2(dy, dx) - baseAngle;
      theta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      let folded = theta % sector;
      if (folded > sector / 2) {
        folded = sector - folded;
      }

      const sx = cx + r * Math.cos(folded + baseAngle);
      const sy = cy + r * Math.sin(folded + baseAngle);

      const [pr, pg, pb, pa] = sampleBilinear(src, w, h, sx, sy);
      const dIdx = (y * w + x) * 4;
      dst[dIdx] = pr;
      dst[dIdx + 1] = pg;
      dst[dIdx + 2] = pb;
      dst[dIdx + 3] = pa;
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 7. 소용돌이 & 꼬집기 (Twirl & Pinch)
// ─────────────────────────────────────────────────────────────
export const applyTwirlPinch = (
  srcData: ImageData,
  params: TwirlParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { angle, pinch } = params;

  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(cx, cy);
  const twirlRad = (angle * Math.PI) / 180;
  const pinchFactor = pinch / 100;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);

      let sx = x;
      let sy = y;

      if (r < maxR && r > 0) {
        const u = r / maxR;
        // Twirl 각도 변위
        const thetaOffset = twirlRad * Math.pow(1 - u, 2);
        const theta = Math.atan2(dy, dx) + thetaOffset;

        // Pinch 거리 변위
        const rNew = maxR * Math.pow(u, 1 + pinchFactor * 0.8);

        sx = cx + rNew * Math.cos(theta);
        sy = cy + rNew * Math.sin(theta);
      }

      const [pr, pg, pb, pa] = sampleBilinear(src, w, h, sx, sy);
      const dIdx = (y * w + x) * 4;
      dst[dIdx] = pr;
      dst[dIdx + 1] = pg;
      dst[dIdx + 2] = pb;
      dst[dIdx + 3] = pa;
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 8. 수면 파문 (Ripple & Swim)
// ─────────────────────────────────────────────────────────────
export const applyRipple = (
  srcData: ImageData,
  params: RippleParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { amplitude, wavelength } = params;
  const freq = (2 * Math.PI) / Math.max(10, wavelength);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = x + amplitude * Math.sin(y * freq);
      const sy = y + amplitude * Math.cos(x * freq);

      const [pr, pg, pb, pa] = sampleBilinear(src, w, h, sx, sy);
      const dIdx = (y * w + x) * 4;
      dst[dIdx] = pr;
      dst[dIdx + 1] = pg;
      dst[dIdx + 2] = pb;
      dst[dIdx + 3] = pa;
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 9. 역동적 블러 (Motion / Zoom Blur)
// ─────────────────────────────────────────────────────────────
export const applyBlur = (
  srcData: ImageData,
  params: BlurParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { mode, distance, angle } = params;
  const samples = 11;
  const half = Math.floor(samples / 2);

  if (mode === 'motion') {
    const rad = (angle * Math.PI) / 180;
    const stepX = (Math.cos(rad) * distance) / samples;
    const stepY = (Math.sin(rad) * distance) / samples;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
        for (let i = -half; i <= half; i++) {
          const sx = clamp(x + i * stepX, 0, w - 1);
          const sy = clamp(y + i * stepY, 0, h - 1);
          const [r, g, b, a] = sampleBilinear(src, w, h, sx, sy);
          sumR += r;
          sumG += g;
          sumB += b;
          sumA += a;
        }
        const dIdx = (y * w + x) * 4;
        dst[dIdx] = Math.round(sumR / samples);
        dst[dIdx + 1] = Math.round(sumG / samples);
        dst[dIdx + 2] = Math.round(sumB / samples);
        dst[dIdx + 3] = Math.round(sumA / samples);
      }
    }
  } else {
    // Zoom Blur
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = distance * 0.03;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0;

        for (let i = 0; i < samples; i++) {
          const factor = 1 - (i / samples) * maxDist;
          const sx = clamp(cx + dx * factor, 0, w - 1);
          const sy = clamp(cy + dy * factor, 0, h - 1);
          const [r, g, b, a] = sampleBilinear(src, w, h, sx, sy);
          sumR += r;
          sumG += g;
          sumB += b;
          sumA += a;
        }
        const dIdx = (y * w + x) * 4;
        dst[dIdx] = Math.round(sumR / samples);
        dst[dIdx + 1] = Math.round(sumG / samples);
        dst[dIdx + 2] = Math.round(sumB / samples);
        dst[dIdx + 3] = Math.round(sumA / samples);
      }
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 10. 빛 번짐 & 광선 (Lens Flare & Rays)
// ─────────────────────────────────────────────────────────────
export const applyLensFlare = (
  srcData: ImageData,
  params: FlareParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { intensity, radius } = params;

  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(cx, cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const sr = src[idx];
      const sg = src[idx + 1];
      const sb = src[idx + 2];
      const lum = sr * 0.299 + sg * 0.587 + sb * 0.114;

      // 중심점 방사형 광선
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // 8방향 빛줄기 패턴
      const rays = Math.pow(Math.cos(angle * 4), 6) * 0.7 + Math.pow(Math.cos(angle * 8), 12) * 0.3;
      const falloff = Math.max(0, 1 - dist / (maxR * (radius / 40)));
      const glow = rays * falloff * intensity * 160;

      // 하이라이트 번짐
      const hlBonus = lum > 180 ? (lum - 180) * 0.3 * intensity : 0;

      dst[idx] = clamp(sr + Math.round(glow * 1.0 + hlBonus), 0, 255);
      dst[idx + 1] = clamp(sg + Math.round(glow * 0.85 + hlBonus), 0, 255);
      dst[idx + 2] = clamp(sb + Math.round(glow * 0.6 + hlBonus * 0.5), 0, 255);
      dst[idx + 3] = src[idx + 3];
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 11. 솔라리제이션 (Solarize)
// ─────────────────────────────────────────────────────────────
export const applySolarize = (
  srcData: ImageData,
  params: SolarizeParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { threshold } = params;

  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];

    dst[i] = r > threshold ? 255 - r : r;
    dst[i + 1] = g > threshold ? 255 - g : g;
    dst[i + 2] = b > threshold ? 255 - b : b;
    dst[i + 3] = src[i + 3];
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 12. 십자수 (Cross Stitch)
// ─────────────────────────────────────────────────────────────
export const applyCrossStitch = (
  srcData: ImageData,
  params: CrossStitchParams,
  canvas: HTMLCanvasElement
): void => {
  const { width: w, height: h, data: src } = srcData;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = w;
  canvas.height = h;

  const { stitchSize, darkFabric } = params;
  ctx.fillStyle = darkFabric ? '#18181B' : '#F4F4F5';
  ctx.fillRect(0, 0, w, h);

  const half = stitchSize / 2;
  ctx.lineWidth = Math.max(1, stitchSize * 0.18);
  ctx.lineCap = 'round';

  for (let y = 0; y < h; y += stitchSize) {
    for (let x = 0; x < w; x += stitchSize) {
      const cx = clamp(x + half, 0, w - 1);
      const cy = clamp(y + half, 0, h - 1);
      const idx = (Math.floor(cy) * w + Math.floor(cx)) * 4;

      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];

      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;

      // 대각선 1: \
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + stitchSize - 2, y + stitchSize - 2);
      ctx.stroke();

      // 대각선 2: /
      ctx.beginPath();
      ctx.moveTo(x + stitchSize - 2, y + 2);
      ctx.lineTo(x + 2, y + stitchSize - 2);
      ctx.stroke();
    }
  }
};

// ─────────────────────────────────────────────────────────────
// 13. 아스키 아트 (ASCII Art)
// ─────────────────────────────────────────────────────────────
export const applyAsciiArt = (
  srcData: ImageData,
  params: AsciiParams,
  canvas: HTMLCanvasElement
): void => {
  const { width: w, height: h, data: src } = srcData;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = w;
  canvas.height = h;

  const { fontSize, colorMode } = params;
  ctx.fillStyle = colorMode === 'matrix' ? '#000000' : '#0B0F19';
  ctx.fillRect(0, 0, w, h);

  const chars = '@%#*+=-:. ';
  const charW = Math.round(fontSize * 0.62);
  const charH = fontSize;

  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let y = 0; y < h; y += charH) {
    for (let x = 0; x < w; x += charW) {
      const cx = clamp(x + charW / 2, 0, w - 1);
      const cy = clamp(y + charH / 2, 0, h - 1);
      const idx = (Math.floor(cy) * w + Math.floor(cx)) * 4;

      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      const charIdx = Math.floor((1 - lum) * (chars.length - 1));
      const char = chars[charIdx] || ' ';

      if (colorMode === 'matrix') {
        ctx.fillStyle = `rgb(0, ${Math.round(lum * 220 + 35)}, 70)`;
      } else if (colorMode === 'bw') {
        ctx.fillStyle = `rgb(${r}, ${r}, ${r})`;
      } else {
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      }

      ctx.fillText(char, x + charW / 2, y + charH / 2);
    }
  }
};

// ─────────────────────────────────────────────────────────────
// 14. 적외선 열화상 카메라 (Thermal Heatmap)
// ─────────────────────────────────────────────────────────────
const generateThermalLut = (palette: 'ironbow' | 'jet' | 'inferno'): Uint8Array => {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let r = 0, g = 0, b = 0;

    if (palette === 'jet') {
      // Blue -> Cyan -> Green -> Yellow -> Red
      r = clamp(Math.min(4 * t - 1.5, -4 * t + 4.5), 0, 1) * 255;
      g = clamp(Math.min(4 * t - 0.5, -4 * t + 3.5), 0, 1) * 255;
      b = clamp(Math.min(4 * t + 0.5, -4 * t + 2.5), 0, 1) * 255;
    } else if (palette === 'inferno') {
      // Black -> Purple -> Orange -> Yellow
      r = clamp(Math.pow(t, 0.7) * 255, 0, 255);
      g = clamp(Math.pow(t, 1.6) * 230, 0, 255);
      b = clamp(Math.sin(t * Math.PI) * 180 + Math.pow(t, 3) * 75, 0, 255);
    } else {
      // Ironbow (Classic Flir thermal)
      if (t < 0.25) {
        const u = t / 0.25;
        r = u * 40;
        g = 0;
        b = u * 140;
      } else if (t < 0.5) {
        const u = (t - 0.25) / 0.25;
        r = 40 + u * 160;
        g = 0;
        b = 140 - u * 80;
      } else if (t < 0.75) {
        const u = (t - 0.5) / 0.25;
        r = 200 + u * 55;
        g = u * 180;
        b = 60 - u * 60;
      } else {
        const u = (t - 0.75) / 0.25;
        r = 255;
        g = 180 + u * 75;
        b = u * 255;
      }
    }

    lut[i * 3] = Math.round(r);
    lut[i * 3 + 1] = Math.round(g);
    lut[i * 3 + 2] = Math.round(b);
  }
  return lut;
};

export const applyThermal = (
  srcData: ImageData,
  params: ThermalParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const lut = generateThermalLut(params.palette);

  for (let i = 0; i < src.length; i += 4) {
    const lum = Math.round(src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);
    const lIdx = lum * 3;
    dst[i] = lut[lIdx];
    dst[i + 1] = lut[lIdx + 1];
    dst[i + 2] = lut[lIdx + 2];
    dst[i + 3] = src[i + 3];
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 15. 적청 입체 안경 (Anaglyph 3D)
// ─────────────────────────────────────────────────────────────
export const applyAnaglyph = (
  srcData: ImageData,
  params: AnaglyphParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { offset } = params;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dIdx = (y * w + x) * 4;

      // 좌측 눈 (Red): +offset x
      const xLeft = clamp(x + offset, 0, w - 1);
      const idxLeft = (y * w + xLeft) * 4;
      const red = src[idxLeft];

      // 우측 눈 (Cyan: Green + Blue): -offset x
      const xRight = clamp(x - offset, 0, w - 1);
      const idxRight = (y * w + xRight) * 4;
      const green = src[idxRight + 1];
      const blue = src[idxRight + 2];

      dst[dIdx] = red;
      dst[dIdx + 1] = green;
      dst[dIdx + 2] = blue;
      dst[dIdx + 3] = src[dIdx + 3];
    }
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 16. 연필 스케치 (Pencil Sketch / Croquis)
// ─────────────────────────────────────────────────────────────
const fastBoxBlur1D = (
  src: Uint8Array,
  dst: Uint8Array,
  w: number,
  h: number,
  r: number
) => {
  const temp = new Uint8Array(w * h);
  const windowSize = 2 * r + 1;

  // Horizontal Pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let sum = 0;
    for (let x = -r; x <= r; x++) {
      sum += src[rowOffset + clamp(x, 0, w - 1)];
    }
    for (let x = 0; x < w; x++) {
      temp[rowOffset + x] = Math.round(sum / windowSize);
      const nextX = clamp(x + r + 1, 0, w - 1);
      const prevX = clamp(x - r, 0, w - 1);
      sum += src[rowOffset + nextX] - src[rowOffset + prevX];
    }
  }

  // Vertical Pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) {
      sum += temp[clamp(y, 0, h - 1) * w + x];
    }
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = Math.round(sum / windowSize);
      const nextY = clamp(y + r + 1, 0, h - 1);
      const prevY = clamp(y - r, 0, h - 1);
      sum += temp[nextY * w + x] - temp[prevY * w + x];
    }
  }
};

export const applyPencilSketch = (
  srcData: ImageData,
  params: SketchParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(w, h);
  const dst = out.data;
  const { blurRadius, intensity, tone } = params;
  const r = Math.max(1, Math.round(blurRadius));

  const numPixels = w * h;
  const gray = new Uint8Array(numPixels);
  const invGray = new Uint8Array(numPixels);

  // 1. Grayscale & Invert
  for (let i = 0; i < numPixels; i++) {
    const sIdx = i * 4;
    const g = Math.round(
      src[sIdx] * 0.299 + src[sIdx + 1] * 0.587 + src[sIdx + 2] * 0.114
    );
    gray[i] = g;
    invGray[i] = 255 - g;
  }

  // 2. Multi-pass Separable Box Blur on inverted grayscale
  const blurred1 = new Uint8Array(numPixels);
  const blurred2 = new Uint8Array(numPixels);
  fastBoxBlur1D(invGray, blurred1, w, h, r);
  fastBoxBlur1D(blurred1, blurred2, w, h, r);

  // 3. Color Dodge Blend & Tone Map
  const contrastFactor = intensity / 100;

  for (let i = 0; i < numPixels; i++) {
    const g = gray[i];
    const b = blurred2[i];

    // Color Dodge: min(255, (g * 256) / (255 - b + 1))
    let dodge = Math.floor((g * 256) / (255 - b + 1));
    if (dodge > 255) dodge = 255;

    // Intensity / Contrast adjustment
    let sketchVal = dodge;
    if (contrastFactor !== 1) {
      sketchVal = clamp(Math.round(255 - (255 - dodge) * contrastFactor), 0, 255);
    }

    const dIdx = i * 4;
    if (tone === 'color') {
      // 색연필 스케치: 원본 색상과 스케치 명암 합성
      dst[dIdx] = clamp(Math.round((src[dIdx] * sketchVal) / 255), 0, 255);
      dst[dIdx + 1] = clamp(Math.round((src[dIdx + 1] * sketchVal) / 255), 0, 255);
      dst[dIdx + 2] = clamp(Math.round((src[dIdx + 2] * sketchVal) / 255), 0, 255);
    } else if (tone === 'sepia') {
      // 세피아 크로키 북 톤
      dst[dIdx] = clamp(Math.round(sketchVal * 0.96), 0, 255);
      dst[dIdx + 1] = clamp(Math.round(sketchVal * 0.88), 0, 255);
      dst[dIdx + 2] = clamp(Math.round(sketchVal * 0.74), 0, 255);
    } else {
      // 클래식 흑연 연필화
      dst[dIdx] = sketchVal;
      dst[dIdx + 1] = sketchVal;
      dst[dIdx + 2] = sketchVal;
    }
    dst[dIdx + 3] = src[dIdx + 3];
  }

  return out;
};

// ─────────────────────────────────────────────────────────────
// 16. 비네트 (Vignette)
// ─────────────────────────────────────────────────────────────
export const applyVignette = (
  srcData: ImageData,
  params: VignetteParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(new Uint8ClampedArray(src), w, h);
  const { strength, feather } = params;
  const cx = w / 2, cy = h / 2;

  // inner edge: feather=0 → starts at 0.8, feather=80 → starts at 0
  const innerEdge = 0.8 - (feather / 100) * 0.8;
  const outerEdge = 1.42; // sqrt(2) ≈ corner of normalized ellipse
  const maxDark = strength / 100;

  for (let y = 0; y < h; y++) {
    const ny = (y - cy) / cy;
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / cx;
      const dist = Math.sqrt(nx * nx + ny * ny);

      let factor = 1.0;
      if (dist > innerEdge) {
        const t = Math.min((dist - innerEdge) / (outerEdge - innerEdge), 1);
        const smooth = t * t * (3 - 2 * t); // smoothstep
        factor = 1 - smooth * maxDark;
      }

      const i = (y * w + x) * 4;
      out.data[i]     = clamp(Math.round(src[i]     * factor), 0, 255);
      out.data[i + 1] = clamp(Math.round(src[i + 1] * factor), 0, 255);
      out.data[i + 2] = clamp(Math.round(src[i + 2] * factor), 0, 255);
    }
  }
  return out;
};

// ─────────────────────────────────────────────────────────────
// 17. 필름 그레인 (Film Grain)
// ─────────────────────────────────────────────────────────────
const GRAIN_TILE = 512;
const buildGrainTile = (): Float32Array => {
  const tile = new Float32Array(GRAIN_TILE * GRAIN_TILE);
  for (let i = 0; i < tile.length; i++) {
    // Box-Muller Gaussian noise
    const u1 = Math.random() + 1e-10;
    const u2 = Math.random();
    tile[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  return tile;
};

export const applyFilmGrain = (
  srcData: ImageData,
  params: GrainParams
): ImageData => {
  const { width: w, height: h, data: src } = srcData;
  const out = new ImageData(new Uint8ClampedArray(src), w, h);
  const { intensity, size, colorShift, vignette: vigStr } = params;
  const cx = w / 2, cy = h / 2;

  const grainTile = buildGrainTile();
  const vigMax = vigStr / 100;

  for (let y = 0; y < h; y++) {
    const ny = (y - cy) / cy;
    const gy = Math.floor(y / size) & (GRAIN_TILE - 1);

    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const gx = Math.floor(x / size) & (GRAIN_TILE - 1);
      const noise = grainTile[gy * GRAIN_TILE + gx] * intensity;

      // Elliptical vignette
      let vfactor = 1.0;
      if (vigMax > 0) {
        const nx = (x - cx) / cx;
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist > 0.4) {
          const t = Math.min((dist - 0.4) / 1.0, 1);
          vfactor = 1 - t * t * (3 - 2 * t) * vigMax;
        }
      }

      // Warm vintage color cast
      const warmR = colorShift ? 10 : 0;
      const warmG = colorShift ? 2 : 0;
      const warmB = colorShift ? -16 : 0;

      out.data[i]     = clamp(Math.round((src[i]     + warmR) * vfactor + noise), 0, 255);
      out.data[i + 1] = clamp(Math.round((src[i + 1] + warmG) * vfactor + noise), 0, 255);
      out.data[i + 2] = clamp(Math.round((src[i + 2] + warmB) * vfactor + noise), 0, 255);
    }
  }
  return out;
};

// ─────────────────────────────────────────────────────────────
// 메인 디스패처: applyImageEffect
// ─────────────────────────────────────────────────────────────
export const applyImageEffect = (
  targetCanvas: HTMLCanvasElement,
  sourceCanvas: HTMLCanvasElement,
  effectType: EffectType,
  params: EffectParamsMap,
  blend = 100  // 0 = 원본, 100 = 효과 100%
): void => {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  targetCanvas.width = w;
  targetCanvas.height = h;

  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) return;

  const srcData = srcCtx.getImageData(0, 0, w, h);

  // 캔버스 드로잉 기반 효과 — blend 지원: 원본 위에 효과 오버레이
  if (effectType === 'pointillize' || effectType === 'crossStitch' || effectType === 'ascii') {
    if (blend < 100) {
      ctx.drawImage(sourceCanvas, 0, 0);
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      if (effectType === 'pointillize') applyPointillize(srcData, params.pointillize, tmp);
      else if (effectType === 'crossStitch') applyCrossStitch(srcData, params.crossStitch, tmp);
      else applyAsciiArt(srcData, params.ascii, tmp);
      ctx.globalAlpha = blend / 100;
      ctx.drawImage(tmp, 0, 0);
      ctx.globalAlpha = 1;
    } else {
      if (effectType === 'pointillize') applyPointillize(srcData, params.pointillize, targetCanvas);
      else if (effectType === 'crossStitch') applyCrossStitch(srcData, params.crossStitch, targetCanvas);
      else applyAsciiArt(srcData, params.ascii, targetCanvas);
    }
    return;
  }

  // 픽셀 버퍼 ImageData 기반 효과
  let resultImageData: ImageData;
  switch (effectType) {
    case 'sketch':
      resultImageData = applyPencilSketch(srcData, params.sketch);
      break;
    case 'oil':
      resultImageData = applyOilPainting(srcData, params.oil);
      break;
    case 'watercolor':
      resultImageData = applyWatercolor(srcData, params.watercolor);
      break;
    case 'crystallize':
      resultImageData = applyCrystallize(srcData, params.crystallize);
      break;
    case 'marble':
      resultImageData = applyMarble(srcData, params.marble);
      break;
    case 'kaleidoscope':
      resultImageData = applyKaleidoscope(srcData, params.kaleidoscope);
      break;
    case 'twirl':
      resultImageData = applyTwirlPinch(srcData, params.twirl);
      break;
    case 'ripple':
      resultImageData = applyRipple(srcData, params.ripple);
      break;
    case 'blur':
      resultImageData = applyBlur(srcData, params.blur);
      break;
    case 'flare':
      resultImageData = applyLensFlare(srcData, params.flare);
      break;
    case 'solarize':
      resultImageData = applySolarize(srcData, params.solarize);
      break;
    case 'thermal':
      resultImageData = applyThermal(srcData, params.thermal);
      break;
    case 'anaglyph':
      resultImageData = applyAnaglyph(srcData, params.anaglyph);
      break;
    case 'vignette':
      resultImageData = applyVignette(srcData, params.vignette);
      break;
    case 'grain':
      resultImageData = applyFilmGrain(srcData, params.grain);
      break;
    default:
      resultImageData = srcData;
  }

  // 블렌드: 원본과 효과 결과를 픽셀 단위로 선형 보간
  if (blend < 100) {
    const alpha = blend / 100;
    const rd = resultImageData.data;
    const sd = srcData.data;
    for (let i = 0; i < rd.length; i += 4) {
      rd[i]     = Math.round(sd[i]     + (rd[i]     - sd[i])     * alpha);
      rd[i + 1] = Math.round(sd[i + 1] + (rd[i + 1] - sd[i + 1]) * alpha);
      rd[i + 2] = Math.round(sd[i + 2] + (rd[i + 2] - sd[i + 2]) * alpha);
    }
  }

  ctx.putImageData(resultImageData, 0, 0);
};

/**
 * 캔버스 이미지 다운로드 헬퍼
 */
export const downloadCanvas = (
  canvas: HTMLCanvasElement,
  filename: string,
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
