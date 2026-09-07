export type CollageStyleMode = 'grid' | 'tilt' | 'photobooth' | 'mosaic' | 'scatter' | 'filmstrip';
export type FrameStyle = 'none' | 'simple' | 'polaroid';
export type AspectRatio = '1:1' | '4:5' | '3:4' | '9:16' | '16:9' | '1:2';

export interface CollagePhotoItem {
  id: number;
  url: string;
  orgName: string;
  rotationAngle?: number;
  tiltAngle: number;
  scale?: number;
}

export interface CollageConfig {
  mode: CollageStyleMode;
  frameStyle: FrameStyle;
  aspectRatio: AspectRatio;
  templateIndex: number;
  gap: number;
  outerPadding: number;
  borderRadius: number;
  shadow: boolean;
  bgColor: string;
  bgStyle: 'solid' | 'gradient';
  bgColor2: string;
  borderColor: string;
  borderWidth: number;
  tiltIntensity: number;
  showText: boolean;
  customText: string;
}

export interface NormalizedSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScatterItem {
  cx: number;
  cy: number;
  size: number;
  angle: number;
}
