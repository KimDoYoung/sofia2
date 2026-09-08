import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  X,
  Sparkles,
  Shuffle,
  Download,
  Square,
  Smartphone,
  Layers,
  Palette,
  RotateCw,
  Archive,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { ImageFile } from '../types';
import type {
  CollageConfig,
  CollagePhotoItem,
  FrameStyle,
  AspectRatio,
} from '../types/collageTypes';
import {
  getAvailableTemplates,
} from '../utils/collageLayouts';
import {
  renderCollageToCanvas,
  downloadCanvasImage,
} from '../utils/collageRenderer';
import { useToast } from '@/shared/components/ui/use-toast';

interface CollageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImages: ImageFile[];
  folderName?: string;
  folderId?: number;
}

const BG_PRESETS = [
  { label: '화이트', value: '#FFFFFF' },
  { label: '빈티지 크림', value: '#FAF7EE' },
  { label: '소프트 그레이', value: '#F3F4F6' },
  { label: '다크 차콜', value: '#18181B' },
  { label: '파스텔 핑크', value: '#FCE7F3' },
  { label: '세이지 그린', value: '#ECFDF5' },
  { label: '스카이 블루', value: '#EFF6FF' },
];

const ASPECT_RATIOS: { label: string; value: AspectRatio; icon: typeof Square }[] = [
  { label: '1:1 정사각', value: '1:1', icon: Square },
  { label: '4:5 인스타', value: '4:5', icon: Smartphone },
  { label: '3:4 피드', value: '3:4', icon: Smartphone },
  { label: '9:16 스토리', value: '9:16', icon: Smartphone },
  { label: '1:2 인생네컷', value: '1:2', icon: Layers },
  { label: '16:9 와이드', value: '16:9', icon: Square },
];

export const CollageModal = ({
  isOpen,
  onClose,
  selectedImages,
  folderName,
  folderId,
}: CollageModalProps) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cachedCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 기본 텍스트 생성 (오늘 날짜 · SOFIA MOMENTS)
  const getDefaultCollageText = useCallback(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;
    return `${dateStr} · SOFIA MOMENTS`;
  }, []);

  // 사용자 지정 텍스트 로컬 입력 상태 (실시간 타이핑 랙 방지)
  const [textInput, setTextInput] = useState<string>(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;
    return `${dateStr} · SOFIA MOMENTS`;
  });

  // 콜라쥬 아이템 리스트 (순서 및 미세 회전)
  const [photoItems, setPhotoItems] = useState<CollagePhotoItem[]>([]);

  // 콜라쥬 설정
  const [config, setConfig] = useState<CollageConfig>(() => ({
    mode: 'tilt',
    frameStyle: 'polaroid',
    aspectRatio: '1:1',
    templateIndex: 0,
    gap: 10,
    outerPadding: 16,
    borderRadius: 8,
    shadow: true,
    bgColor: '#FAF7EE',
    bgStyle: 'solid',
    bgColor2: '#D1FAE5',
    borderColor: '#E5E7EB',
    borderWidth: 2,
    tiltIntensity: 4,
    showText: true,
    customText: `${new Date().getFullYear()}. ${String(new Date().getMonth() + 1).padStart(2, '0')}. ${String(new Date().getDate()).padStart(2, '0')} · SOFIA MOMENTS`,
  }));

  // 무작위 미세 회전 각도 생성 (-4 ~ +4도)
  const generateRandomTilts = useCallback((count: number): number[] => {
    return Array.from({ length: count }, () => {
      // 0 근처보다는 살짝 기울어진 느낌 (-4 ~ -1 또는 1 ~ 4)
      const sign = Math.random() > 0.5 ? 1 : -1;
      const magnitude = 1.2 + Math.random() * 2.8;
      return Math.round(sign * magnitude * 10) / 10;
    });
  }, []);

  // 모달이 열리거나 선택된 이미지가 바뀔 때 초기화
  useEffect(() => {
    if (!isOpen || selectedImages.length === 0) return;

    cachedCanvasesRef.current.clear();
    setIsInitialLoading(true);

    const tilts = generateRandomTilts(selectedImages.length);
    const initialItems: CollagePhotoItem[] = selectedImages.map((img, i) => ({
      id: img.id,
      url: `/sofia/api/images/${img.id}/raw`,
      orgName: img.orgName,
      rotationAngle: img.rotationAngle || 0,
      tiltAngle: tilts[i],
    }));

    setPhotoItems(initialItems);

    const defaultRatio: AspectRatio = selectedImages.length === 4 ? '1:1' : '1:1';
    const defaultText = getDefaultCollageText();
    setTextInput(defaultText);

    setConfig(prev => ({
      ...prev,
      aspectRatio: defaultRatio,
      templateIndex: 0,
      customText: defaultText,
    }));
  }, [isOpen, selectedImages, generateRandomTilts, getDefaultCollageText]);

  // 텍스트 입력 디바운스 (300ms) - 타이핑 중 캔버스 재렌더링 방지
  useEffect(() => {
    const timer = setTimeout(() => {
      setConfig(prev => {
        if (prev.customText === textInput) return prev;
        return { ...prev, customText: textInput };
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [textInput]);

  // 텍스트 즉시 반영 핸들러 (Enter 또는 onBlur 시)
  const flushTextInput = useCallback(() => {
    setConfig(prev => {
      if (prev.customText === textInput) return prev;
      return { ...prev, customText: textInput };
    });
  }, [textInput]);

  // 실시간 미리보기 캔버스 렌더링
  const updatePreview = useCallback(async () => {
    if (!canvasRef.current || photoItems.length === 0) return;
    setIsRendering(true);
    try {
      // 미리보기는 빠른 반응을 위해 너비 700px로 렌더링 (캐시 재활용으로 <1ms 완료)
      await renderCollageToCanvas(
        canvasRef.current,
        photoItems,
        config,
        700,
        cachedCanvasesRef.current
      );
    } catch (e) {
      console.error('Collage preview render error:', e);
    } finally {
      setIsRendering(false);
      setIsInitialLoading(false);
    }
  }, [photoItems, config]);

  useEffect(() => {
    if (isOpen && photoItems.length > 0) {
      updatePreview();
    }
  }, [isOpen, photoItems, config, updatePreview]);

  // 각도 셔플 핸들러
  const handleShuffleAngles = () => {
    const newTilts = generateRandomTilts(photoItems.length);
    setPhotoItems(prev =>
      prev.map((item, i) => ({
        ...item,
        tiltAngle: newTilts[i],
      }))
    );
  };

  // 사진 순서 셔플 핸들러
  const handleShufflePhotos = () => {
    setPhotoItems(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const buildExportFilename = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_');
    return `${folderName || 'sofia'}_collage_${timestamp}.jpg`;
  };

  // 고화질 다운로드 핸들러
  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const exportCanvas = document.createElement('canvas');
      await renderCollageToCanvas(exportCanvas, photoItems, config, 2400, cachedCanvasesRef.current);
      const filename = buildExportFilename();
      downloadCanvasImage(exportCanvas, filename, 0.95);
      toast({ title: '콜라쥬 저장 완료', description: `${filename} 파일로 다운로드되었습니다.` });
    } catch (err) {
      console.error('Export collage error:', err);
      toast({ title: '다운로드 실패', description: '콜라쥬 생성 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const COLLAGE_MODE_LABELS: Record<string, string> = {
    mosaic: '모자이크', tilt: '감성틸트', scatter: '흩뿌리기',
    grid: '모던그리드', filmstrip: '필름스트립', photobooth: '인생네컷',
  };

  const handleArchive = async (andDownload = false) => {
    setIsExporting(true);
    const start = performance.now();
    try {
      const exportCanvas = document.createElement('canvas');
      await renderCollageToCanvas(exportCanvas, photoItems, config, 2400, cachedCanvasesRef.current);
      const elapsed = Math.round(performance.now() - start);
      const filename = buildExportFilename();

      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(b => b ? resolve(b) : reject(new Error('blob null')), 'image/jpeg', 0.95);
      });

      const autoNote = `콜라쥬-${photoItems.length}장, ${COLLAGE_MODE_LABELS[config.mode] || config.mode}, ${config.aspectRatio}`;

      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('type', 'COLLAGE');
      formData.append('displayFilename', filename);
      formData.append('note', autoNote);
      if (folderId != null) formData.append('sourceFolderId', String(folderId));
      formData.append('elapsedMs', String(elapsed));

      await apiClient.post('/archive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: '콜라쥬 보관 완료', description: '보관소에 저장되었습니다.' });

      if (andDownload) {
        downloadCanvasImage(exportCanvas, filename, 0.95);
      }
    } catch (err) {
      console.error('Archive collage error:', err);
      toast({ title: '저장 실패', description: '보관소 저장 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const templates = getAvailableTemplates(photoItems.length, config.mode);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 text-violet-700 rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                감성 콜라쥬 (Collage)
                <span className="text-xs font-semibold px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                  {selectedImages.length}장
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                구글 포토 스타일의 미세 회전과 감성적인 프레임으로 완성하는 나만의 콜라쥬
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 cursor-pointer"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── 본문 (좌측 미리보기 + 우측 컨트롤) ── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* 좌측: 실시간 캔버스 뷰 */}
          <div className="flex-1 bg-gray-100/90 p-4 sm:p-6 flex flex-col items-center justify-center overflow-auto relative">
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-xl transition-all duration-150"
              />
              {isInitialLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-lg z-10">
                  <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full shadow-md text-xs font-medium text-gray-700">
                    <div className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    사진 로딩 중...
                  </div>
                </div>
              )}
            </div>

            {/* 캔버스 하단 빠른 툴바 */}
            <div className="mt-3 flex items-center gap-2 bg-white/90 backdrop-blur border rounded-full px-3 py-1 shadow-sm text-xs text-gray-700">
              <button
                type="button"
                onClick={handleShuffleAngles}
                className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-gray-100 rounded-full font-medium text-violet-700 cursor-pointer transition-colors"
                title="사진들의 기울기를 무작위로 다시 섞습니다"
              >
                <RotateCw size={13} />
                각도 셔플
              </button>
              <div className="w-px h-3.5 bg-gray-200" />
              <button
                type="button"
                onClick={handleShufflePhotos}
                className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-gray-100 rounded-full font-medium text-gray-700 cursor-pointer transition-colors"
                title="사진들의 배치 순서를 뒤섞습니다"
              >
                <Shuffle size={13} />
                사진 순서 섞기
              </button>
            </div>
          </div>

          {/* 우측: 옵션 컨트롤 패널 */}
          <div className="w-full md:w-84 lg:w-96 border-t md:border-t-0 md:border-l bg-white flex flex-col h-auto md:h-full">
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              {/* 1. 스타일 모드 */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2 uppercase tracking-wider">
                  콜라쥬 스타일
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                  {[
                    { mode: 'mosaic' as const, label: '🖼️ 모자이크', tip: '비율 보존 자동 배치', apply: { frameStyle: 'none' as const, shadow: true, gap: 4 } },
                    { mode: 'tilt' as const, label: '✨ 감성 틸트', tip: '미세 회전 감성룩', apply: { frameStyle: 'polaroid' as const, shadow: true } },
                    { mode: 'scatter' as const, label: '🃏 흩뿌리기', tip: '사진이 겹치며 흩어짐', apply: { frameStyle: 'polaroid' as const, shadow: true, tiltIntensity: 6 } },
                    { mode: 'grid' as const, label: '📐 모던 그리드', tip: '균등 격자 배치', apply: {} },
                    { mode: 'filmstrip' as const, label: '📽️ 필름 스트립', tip: '빈티지 필름 느낌', apply: { bgColor: '#111111', bgStyle: 'solid' as const, frameStyle: 'none' as const } },
                    { mode: 'photobooth' as const, label: '🎫 인생네컷', tip: '세로 포토부스', apply: { aspectRatio: '1:2' as const, frameStyle: 'polaroid' as const } },
                  ].map(({ mode, label, tip, apply }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, mode, ...apply }))}
                      title={tip}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all cursor-pointer leading-tight ${
                        config.mode === mode
                          ? 'bg-white text-violet-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 캔버스 비율 */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2 uppercase tracking-wider">
                  캔버스 비율 (Aspect Ratio)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ASPECT_RATIOS.map(ratio => (
                    <button
                      key={ratio.value}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio.value }))}
                      className={`py-1.5 px-2 text-xs rounded-lg border text-center transition-all cursor-pointer font-medium ${
                        config.aspectRatio === ratio.value
                          ? 'border-violet-600 bg-violet-50/70 text-violet-800 font-semibold shadow-xs'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. 템플릿 레이아웃 (Grid/Tilt 일 때만) */}
              {config.mode !== 'photobooth' && config.mode !== 'mosaic' && config.mode !== 'scatter' && config.mode !== 'filmstrip' && templates.length > 1 && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-2 uppercase tracking-wider">
                    레이아웃 템플릿
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {templates.map(tmpl => (
                      <button
                        key={tmpl.index}
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, templateIndex: tmpl.index }))}
                        className={`p-2 text-left rounded-lg border transition-all cursor-pointer ${
                          config.templateIndex === tmpl.index
                            ? 'border-violet-600 bg-violet-50/70 text-violet-900 font-medium'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{tmpl.label}</div>
                        <div className="text-[11px] text-gray-500 truncate">{tmpl.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. 프레임 & 테두리 스타일 */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-700 block mb-1 uppercase tracking-wider">
                  테두리 / 프레임 스타일
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                  {(['polaroid', 'simple', 'none'] as FrameStyle[]).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, frameStyle: style }))}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        config.frameStyle === style
                          ? 'bg-white text-violet-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {style === 'polaroid' ? '폴라로이드' : style === 'simple' ? '심플 라인' : '없음'}
                    </button>
                  ))}
                </div>

                {/* 그림자 및 날짜 토글 */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-gray-700">입체 그림자 효과 (Drop Shadow)</span>
                  <input
                    type="checkbox"
                    checked={config.shadow}
                    onChange={(e) => setConfig(prev => ({ ...prev, shadow: e.target.checked }))}
                    className="w-4 h-4 text-violet-600 rounded cursor-pointer accent-violet-600"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">하단 문구 표기</span>
                    <input
                      type="checkbox"
                      checked={config.showText}
                      onChange={(e) => setConfig(prev => ({ ...prev, showText: e.target.checked }))}
                      className="w-4 h-4 text-violet-600 rounded cursor-pointer accent-violet-600"
                    />
                  </div>

                  {config.showText && (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              flushTextInput();
                            }
                          }}
                          onBlur={flushTextInput}
                          placeholder="문구를 입력하세요 (예: 2026 제주 여행 🌴)"
                          className="h-8 text-xs bg-gray-50 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const def = getDefaultCollageText();
                            setTextInput(def);
                            setConfig(prev => ({ ...prev, customText: def }));
                          }}
                          className="h-8 px-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-[11px] font-medium shrink-0 cursor-pointer transition-colors"
                          title="기본값 (오늘 날짜 · SOFIA MOMENTS)으로 복원"
                        >
                          기본값
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        원하는 문구나 제목을 입력하면 실시간으로 반영됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. 미세 회전 강도 (Tilt / Scatter 모드일 때) */}
              {(config.mode === 'tilt' || config.mode === 'scatter') && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700">자연스러운 기울기 강도</span>
                    <span className="text-violet-600 font-semibold">{config.tiltIntensity}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={config.tiltIntensity}
                    onChange={(e) => setConfig(prev => ({ ...prev, tiltIntensity: Number(e.target.value) }))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>
              )}

              {/* 6. 간격 및 모서리 둥글기 */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-gray-700">사진 사이 간격 (Gap)</span>
                    <span className="text-gray-500">{config.gap}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="2"
                    value={config.gap}
                    onChange={(e) => setConfig(prev => ({ ...prev, gap: Number(e.target.value) }))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-gray-700">모서리 둥글기 (Radius)</span>
                    <span className="text-gray-500">{config.borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="2"
                    value={config.borderRadius}
                    onChange={(e) => setConfig(prev => ({ ...prev, borderRadius: Number(e.target.value) }))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-gray-700">외곽 여백 (Padding)</span>
                    <span className="text-gray-500">{config.outerPadding}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="36"
                    step="4"
                    value={config.outerPadding}
                    onChange={(e) => setConfig(prev => ({ ...prev, outerPadding: Number(e.target.value) }))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* 7. 배경 색상 */}
              {config.mode !== 'filmstrip' && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                    <Palette size={13} />
                    배경 색상
                  </label>
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    {BG_PRESETS.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, bgColor: color.value }))}
                        style={{ backgroundColor: color.value }}
                        className={`w-7 h-7 rounded-full border border-gray-300 transition-transform cursor-pointer flex items-center justify-center ${
                          config.bgColor === color.value ? 'scale-115 ring-2 ring-violet-600 shadow-sm' : 'hover:scale-105'
                        }`}
                        title={color.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={config.bgColor}
                      onChange={(e) => setConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                      className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer p-0 bg-transparent"
                      title="직접 색상 선택"
                    />
                  </div>

                  {/* 그라디언트 옵션 */}
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="gradientToggle"
                      checked={config.bgStyle === 'gradient'}
                      onChange={(e) => setConfig(prev => ({ ...prev, bgStyle: e.target.checked ? 'gradient' : 'solid' }))}
                      className="w-4 h-4 accent-violet-600 cursor-pointer"
                    />
                    <label htmlFor="gradientToggle" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                      그라디언트 배경
                    </label>
                    {config.bgStyle === 'gradient' && (
                      <input
                        type="color"
                        value={config.bgColor2}
                        onChange={(e) => setConfig(prev => ({ ...prev, bgColor2: e.target.value }))}
                        className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer p-0 bg-transparent ml-1"
                        title="그라디언트 끝 색상"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── 하단 액션 버튼 ── */}
            <div className="p-4 border-t bg-gray-50/80">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={handleDownload}
                  disabled={isExporting || isRendering}
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-2 cursor-pointer shadow-sm"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>{isExporting ? '생성 중...' : '다운로드'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(false)}
                  disabled={isExporting || isRendering}
                  className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                >
                  <Archive size={14} />
                  보관소에 저장
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(true)}
                  disabled={isExporting || isRendering}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
                >
                  <Archive size={14} />
                  저장 후 다운로드
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
