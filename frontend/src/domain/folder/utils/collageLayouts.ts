import type { NormalizedSlot, CollageStyleMode, PixelSlot, ScatterItem } from '../types/collageTypes';

export interface TemplateInfo {
  index: number;
  label: string;
  description: string;
}

export const getAvailableTemplates = (count: number, mode: CollageStyleMode): TemplateInfo[] => {
  if (mode === 'photobooth') {
    return [{ index: 0, label: '세로 스트립', description: `${count}컷 세로 포토부스` }];
  }
  if (mode === 'mosaic' || mode === 'scatter' || mode === 'filmstrip') {
    return [];
  }

  if (count === 2) {
    return [
      { index: 0, label: '좌우 1:1', description: '좌우 반반 분할' },
      { index: 1, label: '상하 1:1', description: '상하 반반 분할' },
      { index: 2, label: '비대칭 강조', description: '좌측 60% 메인' },
    ];
  }

  if (count === 3) {
    return [
      { index: 0, label: '좌측 메인 + 2', description: '좌측 1장, 우측 2장' },
      { index: 1, label: '상단 와이드 + 2', description: '상단 1장, 하단 2장' },
      { index: 2, label: '세로 3분할', description: '나란히 3분할' },
    ];
  }

  if (count === 4) {
    return [
      { index: 0, label: '2x2 격자', description: '균등 4분할 격자' },
      { index: 1, label: '좌측 메인 + 3', description: '좌측 1장, 우측 세로 3장' },
      { index: 2, label: '상단 메인 + 3', description: '상단 1장, 하단 가로 3장' },
      { index: 3, label: '포토 스트립', description: '인생네컷 세로 4분할' },
    ];
  }

  if (count === 5) {
    return [
      { index: 0, label: '2 + 3 분할', description: '상단 2장, 하단 3장' },
      { index: 1, label: '좌측 메인 + 4', description: '좌측 1장, 우측 4장' },
      { index: 2, label: '1 + 4 분할', description: '상단 1장, 하단 4장' },
    ];
  }

  if (count === 6) {
    return [
      { index: 0, label: '3x2 격자', description: '3열 2행 균등 격자' },
      { index: 1, label: '2x3 격자', description: '2열 3행 균등 격자' },
      { index: 2, label: '메인 1 + 5', description: '좌측 대형 1장 + 5장' },
    ];
  }

  // 7장 이상
  return [
    { index: 0, label: '자동 균등 격자', description: '최적 열/행 자동 분할' },
    { index: 1, label: '메인 1장 + 격자', description: '첫 번째 사진 강조' },
  ];
};

export const getNormalizedSlots = (
  count: number,
  mode: CollageStyleMode,
  templateIndex: number
): NormalizedSlot[] => {
  if (count <= 0) return [];

  // 1. 포토부스 모드
  if (mode === 'photobooth') {
    return Array.from({ length: count }, (_, i) => ({
      x: 0,
      y: i / count,
      width: 1,
      height: 1 / count,
    }));
  }

  // 2. 2장
  if (count === 2) {
    if (templateIndex === 1) {
      // 상하
      return [
        { x: 0, y: 0, width: 1, height: 0.5 },
        { x: 0, y: 0.5, width: 1, height: 0.5 },
      ];
    }
    if (templateIndex === 2) {
      // 비대칭 6:4
      return [
        { x: 0, y: 0, width: 0.6, height: 1 },
        { x: 0.6, y: 0, width: 0.4, height: 1 },
      ];
    }
    // 좌우 기본
    return [
      { x: 0, y: 0, width: 0.5, height: 1 },
      { x: 0.5, y: 0, width: 0.5, height: 1 },
    ];
  }

  // 3. 3장
  if (count === 3) {
    if (templateIndex === 1) {
      // 상단 1장 + 하단 2장
      return [
        { x: 0, y: 0, width: 1, height: 0.5 },
        { x: 0, y: 0.5, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
      ];
    }
    if (templateIndex === 2) {
      // 세로 3분할
      const w = 1 / 3;
      return [
        { x: 0, y: 0, width: w, height: 1 },
        { x: w, y: 0, width: w, height: 1 },
        { x: w * 2, y: 0, width: w, height: 1 },
      ];
    }
    // 좌측 큰 1장 + 우측 2장 (기본)
    return [
      { x: 0, y: 0, width: 0.5, height: 1 },
      { x: 0.5, y: 0, width: 0.5, height: 0.5 },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ];
  }

  // 4. 4장
  if (count === 4) {
    if (templateIndex === 1) {
      // 좌측 1장 + 우측 세로 3장
      return [
        { x: 0, y: 0, width: 0.65, height: 1 },
        { x: 0.65, y: 0, width: 0.35, height: 1 / 3 },
        { x: 0.65, y: 1 / 3, width: 0.35, height: 1 / 3 },
        { x: 0.65, y: 2 / 3, width: 0.35, height: 1 / 3 },
      ];
    }
    if (templateIndex === 2) {
      // 상단 1장 + 하단 가로 3장
      return [
        { x: 0, y: 0, width: 1, height: 0.6 },
        { x: 0, y: 0.6, width: 1 / 3, height: 0.4 },
        { x: 1 / 3, y: 0.6, width: 1 / 3, height: 0.4 },
        { x: 2 / 3, y: 0.6, width: 1 / 3, height: 0.4 },
      ];
    }
    if (templateIndex === 3) {
      // 세로 4단 스트립
      return [
        { x: 0, y: 0, width: 1, height: 0.25 },
        { x: 0, y: 0.25, width: 1, height: 0.25 },
        { x: 0, y: 0.5, width: 1, height: 0.25 },
        { x: 0, y: 0.75, width: 1, height: 0.25 },
      ];
    }
    // 2x2 격자 (기본)
    return [
      { x: 0, y: 0, width: 0.5, height: 0.5 },
      { x: 0.5, y: 0, width: 0.5, height: 0.5 },
      { x: 0, y: 0.5, width: 0.5, height: 0.5 },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ];
  }

  // 5. 5장
  if (count === 5) {
    if (templateIndex === 1) {
      // 좌측 1장 + 우측 4장(2x2)
      return [
        { x: 0, y: 0, width: 0.5, height: 1 },
        { x: 0.5, y: 0, width: 0.25, height: 0.5 },
        { x: 0.75, y: 0, width: 0.25, height: 0.5 },
        { x: 0.5, y: 0.5, width: 0.25, height: 0.5 },
        { x: 0.75, y: 0.5, width: 0.25, height: 0.5 },
      ];
    }
    if (templateIndex === 2) {
      // 상단 1장 + 하단 4장
      return [
        { x: 0, y: 0, width: 1, height: 0.5 },
        { x: 0, y: 0.5, width: 0.25, height: 0.5 },
        { x: 0.25, y: 0.5, width: 0.25, height: 0.5 },
        { x: 0.5, y: 0.5, width: 0.25, height: 0.5 },
        { x: 0.75, y: 0.5, width: 0.25, height: 0.5 },
      ];
    }
    // 상단 2장 + 하단 3장 (기본)
    return [
      { x: 0, y: 0, width: 0.5, height: 0.5 },
      { x: 0.5, y: 0, width: 0.5, height: 0.5 },
      { x: 0, y: 0.5, width: 1 / 3, height: 0.5 },
      { x: 1 / 3, y: 0.5, width: 1 / 3, height: 0.5 },
      { x: 2 / 3, y: 0.5, width: 1 / 3, height: 0.5 },
    ];
  }

  // 6. 6장
  if (count === 6) {
    if (templateIndex === 1) {
      // 2열 3행 (2x3)
      return [
        { x: 0, y: 0, width: 0.5, height: 1 / 3 },
        { x: 0.5, y: 0, width: 0.5, height: 1 / 3 },
        { x: 0, y: 1 / 3, width: 0.5, height: 1 / 3 },
        { x: 0.5, y: 1 / 3, width: 0.5, height: 1 / 3 },
        { x: 0, y: 2 / 3, width: 0.5, height: 1 / 3 },
        { x: 0.5, y: 2 / 3, width: 0.5, height: 1 / 3 },
      ];
    }
    if (templateIndex === 2) {
      // 메인 1 + 5장
      return [
        { x: 0, y: 0, width: 0.6, height: 0.666 },
        { x: 0.6, y: 0, width: 0.4, height: 0.333 },
        { x: 0.6, y: 0.333, width: 0.4, height: 0.333 },
        { x: 0, y: 0.666, width: 1 / 3, height: 0.334 },
        { x: 1 / 3, y: 0.666, width: 1 / 3, height: 0.334 },
        { x: 2 / 3, y: 0.666, width: 1 / 3, height: 0.334 },
      ];
    }
    // 3열 2행 (3x2 기본)
    return [
      { x: 0, y: 0, width: 1 / 3, height: 0.5 },
      { x: 1 / 3, y: 0, width: 1 / 3, height: 0.5 },
      { x: 2 / 3, y: 0, width: 1 / 3, height: 0.5 },
      { x: 0, y: 0.5, width: 1 / 3, height: 0.5 },
      { x: 1 / 3, y: 0.5, width: 1 / 3, height: 0.5 },
      { x: 2 / 3, y: 0.5, width: 1 / 3, height: 0.5 },
    ];
  }

  // 7장 이상: 일반화된 자동 격자
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const slots: NormalizedSlot[] = [];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // 마지막 행 아이템들의 너비 균등 처리
    const itemsInThisRow = (row === rows - 1) ? (count - row * cols) : cols;
    const w = 1 / itemsInThisRow;
    const h = 1 / rows;

    slots.push({
      x: col * w,
      y: row * h,
      width: w,
      height: h,
    });
  }

  return slots;
};

// ─── Justified / Mosaic layout ───────────────────────────────────────────────
// Packs images into rows, each row same height, images keep natural aspect ratio.
// Uses binary search to find rowH that makes total height = availH.

const packIntoRows = (
  aspectRatios: number[],
  availW: number,
  gap: number,
  targetRowH: number,
): number[][] => {
  const rows: number[][] = [];
  let currentRow: number[] = [];
  let currentW = 0;

  for (let i = 0; i < aspectRatios.length; i++) {
    const imgW = aspectRatios[i] * targetRowH;
    const addW = currentRow.length > 0 ? gap + imgW : imgW;
    if (currentRow.length > 0 && currentW + addW > availW * 1.08) {
      rows.push([...currentRow]);
      currentRow = [i];
      currentW = imgW;
    } else {
      currentRow.push(i);
      currentW += addW;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  return rows;
};

const rowNaturalHeight = (row: number[], aspectRatios: number[], availW: number, gap: number): number => {
  const sumAR = row.reduce((s, idx) => s + aspectRatios[idx], 0);
  const gapW = gap * (row.length - 1);
  return sumAR > 0 ? (availW - gapW) / sumAR : 0;
};

export const getJustifiedLayout = (
  aspectRatios: number[],
  availW: number,
  availH: number,
  gap: number,
): PixelSlot[] => {
  const count = aspectRatios.length;
  if (count === 0) return [];

  // Binary search: find targetRowH that makes total height ≈ availH
  let lo = 20;
  let hi = availH;

  for (let iter = 0; iter < 32; iter++) {
    const mid = (lo + hi) / 2;
    const rows = packIntoRows(aspectRatios, availW, gap, mid);
    const heights = rows.map(r => rowNaturalHeight(r, aspectRatios, availW, gap));
    const totalH = heights.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);
    if (totalH > availH) hi = mid;
    else lo = mid;
  }

  const targetRowH = (lo + hi) / 2;
  const rows = packIntoRows(aspectRatios, availW, gap, targetRowH);
  const rawHeights = rows.map(r => rowNaturalHeight(r, aspectRatios, availW, gap));
  const totalGapH = gap * (rows.length - 1);
  const totalRawH = rawHeights.reduce((a, b) => a + b, 0);
  const hScale = (availH - totalGapH) / Math.max(totalRawH, 1);

  const slots: PixelSlot[] = new Array(count);
  let y = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rowH = rawHeights[r] * hScale;
    const gapW = gap * (row.length - 1);
    const sumW = row.reduce((s, idx) => s + aspectRatios[idx] * rowH, 0);
    const wScale = (availW - gapW) / Math.max(sumW, 1);

    let x = 0;
    for (const idx of row) {
      const imgW = aspectRatios[idx] * rowH * wScale;
      slots[idx] = { x, y, w: imgW, h: rowH };
      x += imgW + gap;
    }
    y += rowH + gap;
  }

  return slots;
};

// ─── Scatter layout ───────────────────────────────────────────────────────────
// Grid-based base positions with random offsets so photos spread across canvas.

const seededRand = (seed: number) => {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export const getScatterLayout = (
  count: number,
  availW: number,
  availH: number,
  seed = 12345,
): ScatterItem[] => {
  const rand = seededRand(seed);
  const minDim = Math.min(availW, availH);
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const baseCX = (col + 0.5) / cols * availW;
    const baseCY = (row + 0.5) / rows * availH;
    const maxOffset = minDim * 0.12;
    return {
      cx: baseCX + (rand() - 0.5) * 2 * maxOffset,
      cy: baseCY + (rand() - 0.5) * 2 * maxOffset,
      size: minDim * (0.28 + rand() * 0.22),
      angle: (rand() - 0.5) * 30,
    };
  });
};
