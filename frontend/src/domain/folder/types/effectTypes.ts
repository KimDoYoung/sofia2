export type EffectCategory = 'artistic' | 'distortion' | 'color';

export type EffectType =
  | 'oil'
  | 'watercolor'
  | 'crystallize'
  | 'pointillize'
  | 'marble'
  | 'kaleidoscope'
  | 'twirl'
  | 'ripple'
  | 'blur'
  | 'flare'
  | 'solarize'
  | 'crossStitch'
  | 'ascii'
  | 'thermal'
  | 'anaglyph'
  | 'sketch';

export interface SketchParams {
  blurRadius: number; // 4 ~ 24 (선 굵기/디테일)
  intensity: number; // 50 ~ 150 (%) (연필 진하기)
  tone: 'mono' | 'color' | 'sepia'; // 흑연 / 색연필 / 세피아
}

export interface OilParams {
  radius: number; // 2 ~ 8
  levels: number; // 10 ~ 30
}

export interface WatercolorParams {
  smoothness: number; // 1 ~ 5
  edgeStrength: number; // 0 ~ 100 (%)
}

export interface CrystallizeParams {
  cellSize: number; // 8 ~ 32
  borderWidth: number; // 0 ~ 4
}

export interface PointillizeParams {
  dotSize: number; // 3 ~ 12
  density: number; // 50 ~ 100 (%)
}

export interface MarbleParams {
  turbulence: number; // 1 ~ 10
  palette: 'marble' | 'wood';
}

export interface KaleidoscopeParams {
  facets: 4 | 6 | 8 | 12;
  angle: number; // 0 ~ 360
}

export interface TwirlParams {
  angle: number; // -360 ~ 360
  pinch: number; // -100 ~ 100
}

export interface RippleParams {
  amplitude: number; // 2 ~ 20
  wavelength: number; // 20 ~ 100
}

export interface BlurParams {
  mode: 'motion' | 'zoom';
  distance: number; // 4 ~ 30
  angle: number; // 0 ~ 180 (motion일 때)
}

export interface FlareParams {
  intensity: number; // 0.2 ~ 2.0
  radius: number; // 20 ~ 80
}

export interface SolarizeParams {
  threshold: number; // 64 ~ 192
}

export interface CrossStitchParams {
  stitchSize: number; // 6 ~ 16
  darkFabric: boolean;
}

export interface AsciiParams {
  fontSize: number; // 8 ~ 16
  colorMode: 'color' | 'matrix' | 'bw';
}

export interface ThermalParams {
  palette: 'ironbow' | 'jet' | 'inferno';
}

export interface AnaglyphParams {
  offset: number; // 2 ~ 16
}

export interface EffectParamsMap {
  oil: OilParams;
  watercolor: WatercolorParams;
  crystallize: CrystallizeParams;
  pointillize: PointillizeParams;
  marble: MarbleParams;
  kaleidoscope: KaleidoscopeParams;
  twirl: TwirlParams;
  ripple: RippleParams;
  blur: BlurParams;
  flare: FlareParams;
  solarize: SolarizeParams;
  crossStitch: CrossStitchParams;
  ascii: AsciiParams;
  thermal: ThermalParams;
  anaglyph: AnaglyphParams;
  sketch: SketchParams;
}

export interface EffectMeta {
  id: EffectType;
  name: string;
  enName: string;
  category: EffectCategory;
  description: string;
}

export const EFFECT_METAS: EffectMeta[] = [
  // ── 카테고리 1: 회화 & 예술 ──
  {
    id: 'sketch',
    name: '연필 스케치 (Pencil Sketch)',
    enName: 'Pencil Sketch',
    category: 'artistic',
    description: '컬러 닷지(Color Dodge) 블렌딩으로 정교한 흑연 연필 드로잉 및 색연필 스케치를 연출합니다.',
  },
  {
    id: 'oil',
    name: '유화 (Oil Painting)',
    enName: 'Oil Painting',
    category: 'artistic',
    description: '주변 명도 히스토그램을 기반으로 유화 붓 터치와 두꺼운 질감을 표현합니다.',
  },
  {
    id: 'watercolor',
    name: '수채화 (Water Color)',
    enName: 'Water Color',
    category: 'artistic',
    description: '에지 보존 스무딩과 은은한 윤곽선으로 물감이 부드럽게 번진 수채화를 만듭니다.',
  },
  {
    id: 'crystallize',
    name: '스테인드글라스 (Crystallize)',
    enName: 'Stained Glass',
    category: 'artistic',
    description: '보로노이 다이어그램 알고리즘으로 이미지를 다각형 유리 파편과 납 테두리로 나눕니다.',
  },
  {
    id: 'pointillize',
    name: '점묘화 (Pointillize)',
    enName: 'Pointillize',
    category: 'artistic',
    description: '조르주 쇠라 화풍처럼 수많은 유색 점(Dot)들의 군집으로 이미지를 재구성합니다.',
  },
  {
    id: 'marble',
    name: '마블링 & 목판화 (Texture)',
    enName: 'Wood & Marble',
    category: 'artistic',
    description: '노이즈와 사인파 왜곡을 결합하여 대리석 무늬나 나뭇결 질감을 연출합니다.',
  },

  // ── 카테고리 2: 기하 왜곡 & 역동성 ──
  {
    id: 'kaleidoscope',
    name: '만화경 (Kaleidoscope)',
    enName: 'Kaleidoscope',
    category: 'distortion',
    description: '부채꼴 섹터를 대칭 반사하여 360도 방사형 회전 복사 패턴을 생성합니다.',
  },
  {
    id: 'twirl',
    name: '소용돌이 & 꼬집기 (Twirl & Pinch)',
    enName: 'Twirl & Pinch',
    category: 'distortion',
    description: '중심점을 기준으로 비선형 각도 회전 및 흡입/팽창 왜곡을 부여합니다.',
  },
  {
    id: 'ripple',
    name: '수면 파문 (Ripple & Swim)',
    enName: 'Ripple & Swim',
    category: 'distortion',
    description: '2D 사인/코사인 파동 좌표계를 투영해 물속에서 흔들리는 굴절을 연출합니다.',
  },
  {
    id: 'blur',
    name: '역동적 블러 (Motion / Zoom Blur)',
    enName: 'Motion / Zoom Blur',
    category: 'distortion',
    description: '선형 방향의 속도감 있는 모션 블러 또는 중심 방사형 줌 블러를 적용합니다.',
  },
  {
    id: 'flare',
    name: '빛 번짐 & 광선 (Lens Flare)',
    enName: 'Lens Flare & Rays',
    category: 'distortion',
    description: '밝은 하이라이트 영역에서 뻗어나가는 방사형 빛줄기와 화사한 번짐을 렌더링합니다.',
  },

  // ── 카테고리 3: 컬러 & 레트로 그래픽 ──
  {
    id: 'solarize',
    name: '솔라리제이션 (Solarize)',
    enName: 'Solarize',
    category: 'color',
    description: '암실 과노출(사바티에 효과)처럼 임계값 이상의 밝은 픽셀 색상을 반전시킵니다.',
  },
  {
    id: 'crossStitch',
    name: '십자수 (Cross Stitch)',
    enName: 'Cross Stitch',
    category: 'color',
    description: '격자 블록 위에 천 질감과 함께 정교한 X 형태의 자수 스티치를 마스킹합니다.',
  },
  {
    id: 'ascii',
    name: '아스키 아트 (ASCII Art)',
    enName: 'ASCII Art',
    category: 'color',
    description: '픽셀 명도를 문자 밀도(@%#*+=-:. )에 매핑하여 레트로 텍스트 그래픽으로 변환합니다.',
  },
  {
    id: 'thermal',
    name: '적외선 열화상 (Thermal Camera)',
    enName: 'Thermal Heatmap',
    category: 'color',
    description: '명도에 Ironbow/Jet 컬러맵 룩업 테이블(LUT)을 입혀 체온 측정 화면을 만듭니다.',
  },
  {
    id: 'anaglyph',
    name: '적청 3D (Anaglyph 3D)',
    enName: 'Anaglyph 3D',
    category: 'color',
    description: 'Red와 Cyan 채널의 좌표를 좌우로 어긋나게 합성해 입체 안경용 화면을 생성합니다.',
  },
];

export const DEFAULT_EFFECT_PARAMS: EffectParamsMap = {
  oil: { radius: 4, levels: 20 },
  watercolor: { smoothness: 3, edgeStrength: 40 },
  crystallize: { cellSize: 16, borderWidth: 2 },
  pointillize: { dotSize: 6, density: 80 },
  marble: { turbulence: 5, palette: 'marble' },
  kaleidoscope: { facets: 6, angle: 0 },
  twirl: { angle: 180, pinch: 0 },
  ripple: { amplitude: 8, wavelength: 40 },
  blur: { mode: 'motion', distance: 12, angle: 45 },
  flare: { intensity: 1.0, radius: 40 },
  solarize: { threshold: 128 },
  crossStitch: { stitchSize: 10, darkFabric: true },
  ascii: { fontSize: 10, colorMode: 'color' },
  thermal: { palette: 'ironbow' },
  anaglyph: { offset: 8 },
  sketch: { blurRadius: 10, intensity: 100, tone: 'mono' },
};
