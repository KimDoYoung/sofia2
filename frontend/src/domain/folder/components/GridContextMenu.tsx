import { useEffect, useRef } from 'react';
import {
  CheckSquare,
  Square,
  RotateCw,
  RotateCcw,
  Trash2,
  Layers,
  ArrowUp,
  Download,
  Sparkles,
  Wand2,
  Film,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import pdfIcon from '@/assets/icons/pdf.svg';

interface GridContextMenuProps {
  x: number;
  y: number;
  selectedCount: number;
  isExporting: boolean;
  isMerging: boolean;
  onDownload: () => void;
  isDownloading: boolean;
  onOpenCollage: () => void;
  onOpenEffect?: () => void;
  onOpenSlideShow?: () => void;
  onClose: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkRotate: (angle: number) => void;
  onBulkDelete: () => void;
  onExportPdf: () => void;
  onExportMerge: () => void;
  onScrollToTop: () => void;
  onPrevFolder: () => void;
  onNextFolder: () => void;
  onSelectFolder: () => void;
  hasPrevFolder: boolean;
  hasNextFolder: boolean;
}

export const GridContextMenu = ({
  x,
  y,
  selectedCount,
  isExporting,
  isMerging,
  onDownload,
  isDownloading,
  onOpenCollage,
  onOpenEffect,
  onOpenSlideShow,
  onClose,
  onSelectAll,
  onDeselectAll,
  onBulkRotate,
  onBulkDelete,
  onExportPdf,
  onExportMerge,
  onScrollToTop,
  onPrevFolder,
  onNextFolder,
  onSelectFolder,
  hasPrevFolder,
  hasNextFolder,
}: GridContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const anySelected = selectedCount > 0;

  // 외부 클릭 및 ESC 키 처리
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { capture: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [onClose]);

  // 뷰포트 내 위치 자동 조절 logic
  const adjustedX = Math.max(8, Math.min(x, window.innerWidth - 330));
  const adjustedY = Math.max(8, Math.min(y, window.innerHeight - 440));

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-80 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl py-1.5 px-1.5 text-xs select-none animate-in fade-in zoom-in-95 duration-100 grid grid-cols-2 gap-x-1 gap-y-0.5"
    >
      {/* 이전 폴더 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 hover:bg-gray-100/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!hasPrevFolder}
        onClick={() => {
          onPrevFolder();
          onClose();
        }}
      >
        <ChevronLeft size={16} />
        <span>이전 폴더</span>
      </button>

      {/* 다음 폴더 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 hover:bg-gray-100/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!hasNextFolder}
        onClick={() => {
          onNextFolder();
          onClose();
        }}
      >
        <ChevronRight size={16} />
        <span>다음 폴더</span>
      </button>

      {/* 폴더 선택 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 hover:bg-gray-100/80 transition-colors"
        onClick={() => {
          onSelectFolder();
          onClose();
        }}
      >
        <FolderOpen size={16} />
        <span>폴더 선택</span>
      </button>

      {/* 1. 전체 선택 / 전체 해제 */}
      <button
        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-100/80 transition-colors ${
          anySelected ? 'text-green-600 font-medium' : 'text-gray-700'
        }`}
        onClick={() => {
          if (anySelected) {
            onDeselectAll();
          } else {
            onSelectAll();
          }
          onClose();
        }}
      >
        {anySelected ? <CheckSquare size={16} /> : <Square size={16} />}
        <span>{anySelected ? '전체 해제' : '전체 선택'}</span>
      </button>

      <div className="col-span-2 h-px bg-gray-100 my-1" />

      {/* 2. 회전 90° */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 hover:bg-gray-100/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected}
        onClick={() => {
          onBulkRotate(90);
          onClose();
        }}
      >
        <RotateCw size={16} />
        <span>90° 회전</span>
      </button>

      {/* 3. 회전 -90° */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 hover:bg-gray-100/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected}
        onClick={() => {
          onBulkRotate(-90);
          onClose();
        }}
      >
        <RotateCcw size={16} />
        <span>90° 반시계 회전</span>
      </button>

      <div className="col-span-2 h-px bg-gray-100 my-1" />

      {/* 4. 삭제 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected}
        onClick={() => {
          onBulkDelete();
          onClose();
        }}
      >
        <Trash2 size={16} />
        <span>삭제</span>
      </button>

      {/* 8. 맨 위로 가기 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 hover:bg-gray-100/80 transition-colors"
        onClick={() => {
          onScrollToTop();
          onClose();
        }}
      >
        <ArrowUp size={16} />
        <span>맨 위로 가기</span>
      </button>

      <div className="col-span-2 h-px bg-gray-100 my-1" />

      {/* 5. PDF 다운로드 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected || isExporting}
        onClick={() => {
          onExportPdf();
          onClose();
        }}
      >
        {isExporting ? (
          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <img src={pdfIcon} className="w-4 h-4 object-contain" alt="PDF" />
        )}
        <span>{isExporting ? '생성 중...' : 'PDF 다운로드'}</span>
      </button>

      {/* 6. Merge 이미지 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected || isMerging}
        onClick={() => {
          onExportMerge();
          onClose();
        }}
      >
        {isMerging ? (
          <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Layers size={16} />
        )}
        <span>{isMerging ? '병합 중...' : 'Merge 이미지'}</span>
      </button>

      {/* 콜라쥬 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={selectedCount < 2}
        onClick={() => {
          onOpenCollage();
          onClose();
        }}
      >
        <Sparkles size={16} />
        <span>콜라쥬 만들기</span>
      </button>

      {/* 이미지 효과 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-fuchsia-600 hover:bg-fuchsia-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected}
        onClick={() => {
          onOpenEffect?.();
          onClose();
        }}
      >
        <Wand2 size={16} />
        <span>이미지 효과 주기</span>
      </button>

      {/* 슬라이드 쇼 */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={selectedCount < 2}
        onClick={() => {
          onOpenSlideShow?.();
          onClose();
        }}
      >
        <Film size={16} />
        <span>슬라이드 쇼 만들기</span>
      </button>

      {/* 7. 다운로드 (단일 / ZIP) */}
      <button
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected || isDownloading}
        onClick={() => {
          onDownload();
          onClose();
        }}
      >
        {isDownloading ? (
          <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download size={16} />
        )}
        <span>
          {isDownloading
            ? '다운로드 중...'
            : selectedCount > 1
            ? `ZIP 다운로드 (${selectedCount})`
            : '다운로드'}
        </span>
      </button>
    </div>
  );
};

