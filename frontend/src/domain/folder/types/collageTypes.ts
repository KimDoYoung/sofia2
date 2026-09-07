export type CollageStyleMode = 'grid' | 'tilt' | 'photobooth';
export type FrameStyle = 'none' | 'simple' | 'polaroid';
export type AspectRatio = '1:1' | '4:5' | '3:4' | '9:16' | '16:9' | '1:2';

export interface CollagePhotoItem {
  id: number;
  url: string;
  orgName: string;
  rotationAngle?: number; // 원본 이미지 90/180/270 회전
  tiltAngle: number;     // 미세 회전 각도 (-8 ~ +8도)
  scale?: number;
}

export interface CollageConfig {
  mode: CollageStyleMode;
  frameStyle: FrameStyle;
  aspectRatio: AspectRatio;
  templateIndex: number;
  gap: number;           // 사진 사이 간격 (px)
  outerPadding: number;  // 외곽 여백 (px)
  borderRadius: number;  // 모서리 둥글기 (px)
  shadow: boolean;       // 그림자 효과 On/Off
  bgColor: string;       // 배경 색상
  borderColor: string;   // 테두리 색상 (simple 모드 시)
  borderWidth: number;   // 테두리 두께 (px)
  tiltIntensity: number; // 미세 틸트 강도 (0 ~ 8)
  showText: boolean;     // 하단 텍스트 표시 여부
  customText: string;    // 사용자 지정 텍스트 (기본값: 오늘 날짜 · SOFIA MOMENTS)
}

export interface NormalizedSlot {
  x: number;      // 0.0 ~ 1.0
  y: number;      // 0.0 ~ 1.0
  width: number;  // 0.0 ~ 1.0
  height: number; // 0.0 ~ 1.0
}
