import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/shared/components/ui/button';
import {
  X,
  Wand2,
  Eye,
  RotateCcw,
  Download,
  Paintbrush,
  Sparkles,
  Droplets,
  Palette,
  Compass,
  Waves,
  Sun,
  Terminal,
  Flame,
  Glasses,
  Check,
  Zap,
  Pencil,
  Focus,
  Film,
  SlidersHorizontal,
  Archive,
} from 'lucide-react';
import type { ImageFile } from '../types';
import type {
  EffectCategory,
  EffectType,
  EffectParamsMap,
} from '../types/effectTypes';
import {
  EFFECT_METAS,
  DEFAULT_EFFECT_PARAMS,
} from '../types/effectTypes';
import {
  applyImageEffect,
  downloadCanvas,
} from '../utils/imageEffectProcessors';
import { useToast } from '@/shared/components/ui/use-toast';

interface ImageEffectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImages: ImageFile[];
  folderName?: string;
  folderId?: number;
}

const CATEGORIES: { id: EffectCategory; label: string; icon: typeof Paintbrush }[] = [
  { id: 'artistic', label: '회화 & 예술', icon: Paintbrush },
  { id: 'distortion', label: '왜곡 & 역동성', icon: Waves },
  { id: 'color', label: '컬러 & 레트로', icon: Palette },
];

export const ImageEffectModal = ({
  isOpen,
  onClose,
  selectedImages,
  folderName,
  folderId,
}: ImageEffectModalProps) => {
  const { toast } = useToast();

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 로드된 원본 이미지 HTMLImageElement 캐시 (id -> HTMLImageElement)
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<EffectCategory>('artistic');
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('oil');
  const [params, setParams] = useState<EffectParamsMap>(() => ({ ...DEFAULT_EFFECT_PARAMS }));

  const [blend, setBlend] = useState(100);
  const [isComparing, setIsComparing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [batchArchiveProgress, setBatchArchiveProgress] = useState<{ current: number; total: number } | null>(null);

  const activeImage: ImageFile | undefined = selectedImages[activeImageIndex];

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setActiveImageIndex(0);
      setIsComparing(false);
      setBatchProgress(null);
      setBlend(100);
    }
  }, [isOpen]);

  // 이미지 로드 헬퍼 (캐시 사용)
  const loadSourceImage = useCallback(async (imgFile: ImageFile): Promise<HTMLImageElement> => {
    if (imageCacheRef.current.has(imgFile.id)) {
      return imageCacheRef.current.get(imgFile.id)!;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCacheRef.current.set(imgFile.id, img);
        resolve(img);
      };
      img.onerror = (e) => reject(e);
      img.src = `/sofia/api/images/${imgFile.id}/raw`;
    });
  }, []);

  // 90도 회전 적용 캔버스 생성 헬퍼
  const createOrientedCanvas = (img: HTMLImageElement, rotation = 0, maxDim = 800): HTMLCanvasElement => {
    const rot = ((rotation % 360) + 360) % 360;
    const isRot90 = rot === 90 || rot === 270;
    const srcW = isRot90 ? img.height : img.width;
    const srcH = isRot90 ? img.width : img.height;

    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const targetW = Math.round(srcW * scale);
    const targetH = Math.round(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    return canvas;
  };

  // 실시간 미리보기 렌더링 함수
  const updatePreview = useCallback(async () => {
    if (!previewCanvasRef.current || !activeImage) return;

    setIsRendering(true);
    try {
      const img = await loadSourceImage(activeImage);
      // 미리보기는 빠른 연산을 위해 800px 크기로 다운스케일
      const sourceCanvas = createOrientedCanvas(img, activeImage.rotationAngle || 0, 800);
      originalPreviewCanvasRef.current = sourceCanvas;

      if (isComparing) {
        const canvas = previewCanvasRef.current;
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(sourceCanvas, 0, 0);
      } else {
        applyImageEffect(previewCanvasRef.current, sourceCanvas, selectedEffect, params, blend);
      }
    } catch (err) {
      console.error('Effect preview render failed:', err);
    } finally {
      setIsRendering(false);
    }
  }, [activeImage, selectedEffect, params, isComparing, blend, loadSourceImage]);

  useEffect(() => {
    if (isOpen && activeImage) {
      updatePreview();
    }
  }, [isOpen, activeImage, selectedEffect, params, isComparing, blend, updatePreview]);

  // 단일 이미지 고화질 다운로드 핸들러
  const handleDownloadSingle = async () => {
    if (!activeImage) return;
    setIsDownloading(true);
    try {
      const img = await loadSourceImage(activeImage);
      // 고화질 다운로드는 최대 2560px로 렌더링
      const sourceCanvas = createOrientedCanvas(img, activeImage.rotationAngle || 0, 2560);
      const outCanvas = document.createElement('canvas');

      applyImageEffect(outCanvas, sourceCanvas, selectedEffect, params, blend);

      const baseName = activeImage.orgName.replace(/\.[^/.]+$/, '');
      const prefix = folderName ? `${folderName}_` : '';
      const filename = `${prefix}${baseName}_${selectedEffect}.jpg`;
      downloadCanvas(outCanvas, filename, 0.95);

      toast({
        title: '효과 적용 완료',
        description: `${filename} 파일로 저장되었습니다.`,
      });
    } catch (err) {
      console.error('Single download failed:', err);
      toast({
        title: '다운로드 실패',
        description: '효과 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // 선택된 N개 이미지 일괄 다운로드 핸들러
  const handleDownloadBatch = async () => {
    if (selectedImages.length === 0) return;
    setIsDownloading(true);
    setBatchProgress({ current: 0, total: selectedImages.length });

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const item = selectedImages[i];
        setBatchProgress({ current: i + 1, total: selectedImages.length });

        const img = await loadSourceImage(item);
        const sourceCanvas = createOrientedCanvas(img, item.rotationAngle || 0, 2560);
        const outCanvas = document.createElement('canvas');

        applyImageEffect(outCanvas, sourceCanvas, selectedEffect, params, blend);

        const baseName = item.orgName.replace(/\.[^/.]+$/, '');
        const prefix = folderName ? `${folderName}_` : '';
        const filename = `${prefix}${baseName}_${selectedEffect}.jpg`;
        downloadCanvas(outCanvas, filename, 0.95);

        // 브라우저 팝업 차단 방지 및 렌더링 인터벌
        await new Promise((res) => setTimeout(res, 300));
      }

      toast({
        title: '일괄 다운로드 완료',
        description: `${selectedImages.length}개의 이미지에 효과를 적용하여 저장했습니다.`,
      });
    } catch (err) {
      console.error('Batch download failed:', err);
      toast({
        title: '일괄 다운로드 실패',
        description: '일괄 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
      setBatchProgress(null);
    }
  };

  const buildEffectFilename = (imgFile: ImageFile) => {
    const baseName = imgFile.orgName.replace(/\.[^/.]+$/, '');
    const prefix = folderName ? `${folderName}_` : '';
    return `${prefix}${baseName}_${selectedEffect}.jpg`;
  };

  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('blob null')), 'image/jpeg', 0.95);
    });

  const handleArchiveSingle = async () => {
    if (!activeImage || isArchiving) return;
    setIsArchiving(true);
    const start = performance.now();
    try {
      const img = await loadSourceImage(activeImage);
      const sourceCanvas = createOrientedCanvas(img, activeImage.rotationAngle || 0, 2560);
      const outCanvas = document.createElement('canvas');
      applyImageEffect(outCanvas, sourceCanvas, selectedEffect, params, blend);
      const elapsed = Math.round(performance.now() - start);
      const filename = buildEffectFilename(activeImage);
      const blob = await canvasToBlob(outCanvas);

      const effectName = EFFECT_METAS.find(m => m.id === selectedEffect)?.name || selectedEffect;
      const autoNote = `제작방법: 이미지 1장, 효과-${effectName}, 블렌드-${blend}%`;

      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('type', 'EFFECT');
      formData.append('displayFilename', filename);
      formData.append('note', autoNote);
      if (folderId != null) formData.append('sourceFolderId', String(folderId));
      formData.append('elapsedMs', String(elapsed));

      await apiClient.post('/archive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: '효과 보관 완료', description: '보관소에 저장되었습니다.' });
      onClose();
    } catch (err) {
      console.error('Archive single effect failed:', err);
      toast({ title: '저장 실패', description: '보관소 저장 중 오류가 발생했습니다.', variant: 'destructive' });
      setIsArchiving(false);
    }
  };

  const handleArchiveBatch = async () => {
    if (selectedImages.length === 0 || isArchiving) return;
    setIsArchiving(true);
    setBatchArchiveProgress({ current: 0, total: selectedImages.length });
    const batchStart = performance.now();
    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const item = selectedImages[i];
        setBatchArchiveProgress({ current: i + 1, total: selectedImages.length });
        const img = await loadSourceImage(item);
        const sourceCanvas = createOrientedCanvas(img, item.rotationAngle || 0, 2560);
        const outCanvas = document.createElement('canvas');
        applyImageEffect(outCanvas, sourceCanvas, selectedEffect, params, blend);
        const filename = buildEffectFilename(item);
        const blob = await canvasToBlob(outCanvas);

        const effectName = EFFECT_METAS.find(m => m.id === selectedEffect)?.name || selectedEffect;
        const autoNote = `제작방법: 이미지 ${selectedImages.length}장(일괄적용), 효과-${effectName}, 블렌드-${blend}%`;

        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('type', 'EFFECT');
        formData.append('displayFilename', filename);
        formData.append('note', autoNote);
        if (folderId != null) formData.append('sourceFolderId', String(folderId));
        formData.append('elapsedMs', String(Math.round(performance.now() - batchStart)));

        await apiClient.post('/archive/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await new Promise(res => setTimeout(res, 100));
      }
      toast({ title: '일괄 보관 완료', description: `${selectedImages.length}개 이미지가 보관소에 저장되었습니다.` });
      onClose();
    } catch (err) {
      console.error('Archive batch effect failed:', err);
      toast({ title: '일괄 저장 실패', description: '보관소 저장 중 오류가 발생했습니다.', variant: 'destructive' });
      setIsArchiving(false);
      setBatchArchiveProgress(null);
    }
  };

  // 파라미터 기본값 리셋
  const handleResetCurrentParams = () => {
    setParams((prev) => ({
      ...prev,
      [selectedEffect]: { ...DEFAULT_EFFECT_PARAMS[selectedEffect] },
    }));
  };

  if (!isOpen || selectedImages.length === 0) return null;

  const currentMeta = EFFECT_METAS.find((m) => m.id === selectedEffect);
  const filteredMetas = EFFECT_METAS.filter((m) => m.category === activeCategory);

  // 효과별 아이콘 맵
  const getEffectIcon = (id: EffectType) => {
    switch (id) {
      case 'sketch': return Pencil;
      case 'oil': return Paintbrush;
      case 'watercolor': return Droplets;
      case 'crystallize': return Sparkles;
      case 'pointillize': return Palette;
      case 'marble': return Waves;
      case 'kaleidoscope': return Compass;
      case 'twirl': return Zap;
      case 'ripple': return Waves;
      case 'blur': return Sun;
      case 'flare': return Sparkles;
      case 'solarize': return Sun;
      case 'crossStitch': return Palette;
      case 'ascii': return Terminal;
      case 'thermal': return Flame;
      case 'anaglyph': return Glasses;
      case 'vignette': return Focus;
      case 'grain': return Film;
      default: return Wand2;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b bg-gray-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Wand2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                이미지 효과 적용 (Effects)
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                  {selectedImages.length}장 선택됨
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                15가지 예술적 회화, 기하 왜곡, 레트로 그래픽 효과를 실시간으로 미리보고 고화질로 저장합니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 cursor-pointer"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── 본문 (좌측: 미리보기 및 사진 선택 / 우측: 효과 및 옵션 컨트롤) ── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* ── 좌측: 메인 캔버스 뷰 & 썸네일 필름스트립 ── */}
          <div className="flex-1 bg-gray-900/95 p-4 sm:p-5 flex flex-col items-center justify-between overflow-hidden relative">
            {/* 상단/중앙 대형 캔버스 */}
            <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                className="max-h-[58vh] max-w-full object-contain rounded-lg shadow-2xl transition-all duration-150 border border-gray-700/50"
              />

              {/* 로딩 인디케이터 */}
              {isRendering && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-10 pointer-events-none">
                  <div className="flex items-center gap-2 bg-gray-900/90 text-white px-4 py-2 rounded-full shadow-lg text-xs font-medium border border-gray-700">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    효과 적용 중...
                  </div>
                </div>
              )}

              {/* 원본 비교 중 배지 */}
              {isComparing && (
                <div className="absolute top-3 left-3 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md animate-pulse">
                  원본 이미지 확인 중
                </div>
              )}
            </div>

            {/* 캔버스 바로 아래 컨트롤 바 */}
            <div className="w-full flex items-center justify-between px-2 py-2 mt-2 bg-gray-800/80 backdrop-blur rounded-xl border border-gray-700/60 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    isComparing
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-700/80 hover:bg-gray-700 text-gray-200'
                  }`}
                  title="버튼을 누르고 있는 동안 원본 사진을 보여줍니다"
                >
                  <Eye size={14} />
                  <span>원본 비교 (누르고 있기)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCurrentParams}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-700/60 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title="현재 효과 파라미터를 기본값으로 리셋"
                >
                  <RotateCcw size={13} />
                  <span>기본값</span>
                </button>
              </div>

              <div className="text-[11px] text-gray-400 truncate max-w-[220px]">
                {activeImage?.orgName}
              </div>
            </div>

            {/* ── 하단 썸네일 필름스트립 ($n$개 이미지 전환) ── */}
            <div className="w-full mt-3 pt-2.5 border-t border-gray-800">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5 px-1">
                <span className="font-semibold text-gray-300">
                  선택된 사진 목록 ({activeImageIndex + 1} / {selectedImages.length})
                </span>
                <span className="text-[11px] text-gray-500">
                  다른 사진을 클릭하면 현재 효과가 즉시 적용됩니다
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                {selectedImages.map((img, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        isActive
                          ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-105 shadow-md'
                          : 'border-gray-700 opacity-60 hover:opacity-100 hover:border-gray-500'
                      }`}
                      title={img.orgName}
                    >
                      <img
                        src={`/sofia/api/images/${img.id}/thumb`}
                        alt={img.orgName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isActive && (
                        <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                          <Check size={10} />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 truncate px-0.5">
                        {idx + 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 우측: 효과 카테고리 / 효과 선택 / 세부 조절 패널 ── */}
          <div className="w-full md:w-[380px] lg:w-[420px] bg-white border-l flex flex-col overflow-hidden">
            {/* 카테고리 탭 */}
            <div className="grid grid-cols-3 p-2 bg-gray-50/80 border-b gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 ring-1 ring-indigo-500/20'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={16} className="mb-1" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 스크롤 가능한 메인 설정 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 효과 카드 목록 */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wider">
                  효과 선택 ({filteredMetas.length}종)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredMetas.map((meta) => {
                    const Icon = getEffectIcon(meta.id);
                    const isSelected = selectedEffect === meta.id;
                    return (
                      <button
                        key={meta.id}
                        type="button"
                        onClick={() => setSelectedEffect(meta.id)}
                        className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="font-bold text-xs text-gray-900 leading-tight">
                            {meta.name.split(' (')[0]}
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 line-clamp-1">
                          {meta.enName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 현재 선택된 효과 설명 */}
              {currentMeta && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/80 text-xs">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                    <Sparkles size={14} className="text-indigo-600" />
                    {currentMeta.name}
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    {currentMeta.description}
                  </p>
                </div>
              )}

              {/* ── 블렌드 슬라이더 (전 효과 공통) ── */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal size={13} />
                    효과 강도 (Blend)
                  </label>
                  <span className="text-xs font-bold text-indigo-600">{blend}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={blend}
                  onChange={(e) => setBlend(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>원본</span>
                  <span>효과 100%</span>
                </div>
              </div>

              {/* ── 선택된 효과별 세부 옵션 조절 슬라이더 ── */}
              <div className="pt-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    세부 옵션 조절
                  </label>
                  <button
                    type="button"
                    onClick={handleResetCurrentParams}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    옵션 초기화
                  </button>
                </div>

                {/* 0. 연필 스케치 (Sketch) */}
                {selectedEffect === 'sketch' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">선 굵기 (디테일)</span>
                        <span className="font-bold text-indigo-600">{params.sketch.blurRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="24"
                        step="1"
                        value={params.sketch.blurRadius}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            sketch: { ...prev.sketch, blurRadius: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">연필 선 진하기 (명암)</span>
                        <span className="font-bold text-indigo-600">{params.sketch.intensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        step="5"
                        value={params.sketch.intensity}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            sketch: { ...prev.sketch, intensity: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-gray-600">스케치 톤</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['mono', 'color', 'sepia'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              setParams((prev) => ({
                                ...prev,
                                sketch: { ...prev.sketch, tone: t },
                              }))
                            }
                            className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                              params.sketch.tone === t
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                            }`}
                          >
                            {t === 'mono' ? '흑연 연필' : t === 'color' ? '색연필' : '세피아'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 1. 유화 (Oil) */}
                {selectedEffect === 'oil' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">브러시 반경 (Radius)</span>
                        <span className="font-bold text-indigo-600">{params.oil.radius}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="8"
                        step="1"
                        value={params.oil.radius}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            oil: { ...prev.oil, radius: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">물감 농도 레벨 (Levels)</span>
                        <span className="font-bold text-indigo-600">{params.oil.levels}단계</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="30"
                        step="2"
                        value={params.oil.levels}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            oil: { ...prev.oil, levels: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 2. 수채화 (Watercolor) */}
                {selectedEffect === 'watercolor' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">물감 번짐 스무딩</span>
                        <span className="font-bold text-indigo-600">{params.watercolor.smoothness}단계</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={params.watercolor.smoothness}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            watercolor: { ...prev.watercolor, smoothness: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">펜화 윤곽선 강도</span>
                        <span className="font-bold text-indigo-600">{params.watercolor.edgeStrength}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={params.watercolor.edgeStrength}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            watercolor: { ...prev.watercolor, edgeStrength: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 3. 스테인드글라스 (Crystallize) */}
                {selectedEffect === 'crystallize' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">유리 조각 크기 (Cell Size)</span>
                        <span className="font-bold text-indigo-600">{params.crystallize.cellSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="32"
                        step="2"
                        value={params.crystallize.cellSize}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            crystallize: { ...prev.crystallize, cellSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">납 테두리 두께</span>
                        <span className="font-bold text-indigo-600">{params.crystallize.borderWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={params.crystallize.borderWidth}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            crystallize: { ...prev.crystallize, borderWidth: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 4. 점묘화 (Pointillize) */}
                {selectedEffect === 'pointillize' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">점 크기 (Dot Size)</span>
                        <span className="font-bold text-indigo-600">{params.pointillize.dotSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="12"
                        step="1"
                        value={params.pointillize.dotSize}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            pointillize: { ...prev.pointillize, dotSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">점 밀도 (Density)</span>
                        <span className="font-bold text-indigo-600">{params.pointillize.density}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={params.pointillize.density}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            pointillize: { ...prev.pointillize, density: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 5. 마블링 & 목판화 (Marble) */}
                {selectedEffect === 'marble' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">파동 난류 강도</span>
                        <span className="font-bold text-indigo-600">{params.marble.turbulence}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={params.marble.turbulence}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            marble: { ...prev.marble, turbulence: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-gray-600">스타일 톤</span>
                      <div className="flex gap-2">
                        {(['marble', 'wood'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              setParams((prev) => ({
                                ...prev,
                                marble: { ...prev.marble, palette: p },
                              }))
                            }
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                              params.marble.palette === p
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                            }`}
                          >
                            {p === 'marble' ? '대리석 (Marble)' : '목판화 (Wood)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. 만화경 (Kaleidoscope) */}
                {selectedEffect === 'kaleidoscope' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs text-gray-600">대칭 조각 수 (Facets)</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([4, 6, 8, 12] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() =>
                              setParams((prev) => ({
                                ...prev,
                                kaleidoscope: { ...prev.kaleidoscope, facets: f },
                              }))
                            }
                            className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                              params.kaleidoscope.facets === f
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                            }`}
                          >
                            {f}면
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">회전 각도</span>
                        <span className="font-bold text-indigo-600">{params.kaleidoscope.angle}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="15"
                        value={params.kaleidoscope.angle}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            kaleidoscope: { ...prev.kaleidoscope, angle: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 7. 소용돌이 & 꼬집기 (Twirl) */}
                {selectedEffect === 'twirl' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">회오리 각도 (Twirl)</span>
                        <span className="font-bold text-indigo-600">{params.twirl.angle}°</span>
                      </div>
                      <input
                        type="range"
                        min="-360"
                        max="360"
                        step="15"
                        value={params.twirl.angle}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            twirl: { ...prev.twirl, angle: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">꼬집기 / 볼록 (Pinch)</span>
                        <span className="font-bold text-indigo-600">{params.twirl.pinch}%</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="10"
                        value={params.twirl.pinch}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            twirl: { ...prev.twirl, pinch: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 8. 수면 파문 (Ripple) */}
                {selectedEffect === 'ripple' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">파동 진폭 (Amplitude)</span>
                        <span className="font-bold text-indigo-600">{params.ripple.amplitude}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="2"
                        value={params.ripple.amplitude}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            ripple: { ...prev.ripple, amplitude: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">파장 간격 (Wavelength)</span>
                        <span className="font-bold text-indigo-600">{params.ripple.wavelength}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="10"
                        value={params.ripple.wavelength}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            ripple: { ...prev.ripple, wavelength: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 9. 역동적 블러 (Blur) */}
                {selectedEffect === 'blur' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs text-gray-600">블러 모드</span>
                      <div className="flex gap-2">
                        {(['motion', 'zoom'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              setParams((prev) => ({
                                ...prev,
                                blur: { ...prev.blur, mode: m },
                              }))
                            }
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                              params.blur.mode === m
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                            }`}
                          >
                            {m === 'motion' ? '방향 모션 블러' : '방사형 줌 블러'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">블러 거리</span>
                        <span className="font-bold text-indigo-600">{params.blur.distance}px</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="30"
                        step="2"
                        value={params.blur.distance}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            blur: { ...prev.blur, distance: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    {params.blur.mode === 'motion' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">모션 각도</span>
                          <span className="font-bold text-indigo-600">{params.blur.angle}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="180"
                          step="15"
                          value={params.blur.angle}
                          onChange={(e) =>
                            setParams((prev) => ({
                              ...prev,
                              blur: { ...prev.blur, angle: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 10. 빛 번짐 & 광선 (Flare) */}
                {selectedEffect === 'flare' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">광선 강도</span>
                        <span className="font-bold text-indigo-600">{params.flare.intensity.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.0"
                        step="0.2"
                        value={params.flare.intensity}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            flare: { ...prev.flare, intensity: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">빛 번짐 반경</span>
                        <span className="font-bold text-indigo-600">{params.flare.radius}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="80"
                        step="10"
                        value={params.flare.radius}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            flare: { ...prev.flare, radius: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 11. 솔라리제이션 (Solarize) */}
                {selectedEffect === 'solarize' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">반전 명도 임계값</span>
                      <span className="font-bold text-indigo-600">{params.solarize.threshold}</span>
                    </div>
                    <input
                      type="range"
                      min="64"
                      max="192"
                      step="8"
                      value={params.solarize.threshold}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          solarize: { ...prev.solarize, threshold: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                )}

                {/* 12. 십자수 (Cross Stitch) */}
                {selectedEffect === 'crossStitch' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">스티치 크기</span>
                        <span className="font-bold text-indigo-600">{params.crossStitch.stitchSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="16"
                        step="2"
                        value={params.crossStitch.stitchSize}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            crossStitch: { ...prev.crossStitch, stitchSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-600">다크 패브릭 배경</span>
                      <input
                        type="checkbox"
                        checked={params.crossStitch.darkFabric}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            crossStitch: { ...prev.crossStitch, darkFabric: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                )}

                {/* 13. 아스키 아트 (ASCII) */}
                {selectedEffect === 'ascii' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">글자 크기 (Font Size)</span>
                        <span className="font-bold text-indigo-600">{params.ascii.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="16"
                        step="2"
                        value={params.ascii.fontSize}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            ascii: { ...prev.ascii, fontSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-gray-600">컬러 모드</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['color', 'matrix', 'bw'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              setParams((prev) => ({
                                ...prev,
                                ascii: { ...prev.ascii, colorMode: m },
                              }))
                            }
                            className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                              params.ascii.colorMode === m
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                            }`}
                          >
                            {m === 'color' ? '원본 컬러' : m === 'matrix' ? '매트릭스' : '흑백'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 14. 적외선 열화상 (Thermal) */}
                {selectedEffect === 'thermal' && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-600">컬러맵 팔레트</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['ironbow', 'jet', 'inferno'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setParams((prev) => ({
                              ...prev,
                              thermal: { ...prev.thermal, palette: p },
                            }))
                          }
                          className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border capitalize ${
                            params.thermal.palette === p
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                          }`}
                        >
                          {p === 'ironbow' ? '아이언보우' : p === 'jet' ? '제트 (Jet)' : '인페르노'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 15. 적청 3D (Anaglyph) */}
                {selectedEffect === 'anaglyph' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">3D 시차 오프셋 (Offset)</span>
                      <span className="font-bold text-indigo-600">{params.anaglyph.offset}px</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      step="2"
                      value={params.anaglyph.offset}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          anaglyph: { ...prev.anaglyph, offset: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                )}

                {/* 16. 비네트 (Vignette) */}
                {selectedEffect === 'vignette' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">어둡기 강도 (Strength)</span>
                        <span className="font-bold text-indigo-600">{params.vignette.strength}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={params.vignette.strength}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            vignette: { ...prev.vignette, strength: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">그라디언트 부드러움 (Feather)</span>
                        <span className="font-bold text-indigo-600">{params.vignette.feather}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="5"
                        value={params.vignette.feather}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            vignette: { ...prev.vignette, feather: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 17. 필름 그레인 (Grain) */}
                {selectedEffect === 'grain' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">노이즈 세기 (Intensity)</span>
                        <span className="font-bold text-indigo-600">{params.grain.intensity}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={params.grain.intensity}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            grain: { ...prev.grain, intensity: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">입자 크기 (Size)</span>
                        <span className="font-bold text-indigo-600">{params.grain.size}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={params.grain.size}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            grain: { ...prev.grain, size: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">내장 비네트</span>
                        <span className="font-bold text-indigo-600">{params.grain.vignette}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="70"
                        step="5"
                        value={params.grain.vignette}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            grain: { ...prev.grain, vignette: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-600">따뜻한 빈티지 색감 이동</span>
                      <input
                        type="checkbox"
                        checked={params.grain.colorShift}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            grain: { ...prev.grain, colorShift: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 하단 액션 버튼 바 ── */}
            <div className="p-3.5 border-t bg-gray-50/80 flex flex-col gap-2">
              {batchProgress && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-200"
                    style={{
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isDownloading}
                  className="cursor-pointer text-xs"
                >
                  닫기
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedImages.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadBatch}
                        disabled={isDownloading || isRendering || isArchiving}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs cursor-pointer"
                        title="선택된 모든 이미지에 현재 효과를 적용하여 순차 다운로드합니다"
                      >
                        {batchProgress ? (
                          <span>{batchProgress.current} / {batchProgress.total} 다운로드 중...</span>
                        ) : (
                          <span>{selectedImages.length}장 일괄 다운로드</span>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleArchiveBatch}
                        disabled={isDownloading || isRendering || isArchiving}
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs gap-1 cursor-pointer"
                        title="선택된 모든 이미지를 보관소에 저장합니다"
                      >
                        {batchArchiveProgress ? (
                          <span>{batchArchiveProgress.current} / {batchArchiveProgress.total} 저장 중...</span>
                        ) : (
                          <span>{selectedImages.length}장 일괄 보관</span>
                        )}
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchiveSingle}
                    disabled={isDownloading || isRendering || isArchiving}
                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs gap-1 cursor-pointer"
                  >
                    {isArchiving && !batchArchiveProgress ? (
                      <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Archive size={14} />
                    )}
                    <span>보관소에 저장</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleDownloadSingle}
                    disabled={isDownloading || isRendering || isArchiving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isDownloading && !batchProgress ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>현재 사진 저장</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
