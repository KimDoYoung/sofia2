import type { NormalizedSlot, CollageStyleMode } from '../types/collageTypes';

export interface TemplateInfo {
  index: number;
  label: string;
  description: string;
}

export const getAvailableTemplates = (count: number, mode: CollageStyleMode): TemplateInfo[] => {
  if (mode === 'photobooth') {
    return [{ index: 0, label: '세로 스트립', description: `${count}컷 세로 포토부스` }];
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
