import { useEffect, useRef } from 'react';
import {
  CheckSquare,
  Square,
  RotateCw,
  RotateCcw,
  Trash2,
  FileText,
  Layers,
  ArrowUp,
} from 'lucide-react';

interface GridContextMenuProps {
  x: number;
  y: number;
  selectedCount: number;
  isExporting: boolean;
  isMerging: boolean;
  onClose: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkRotate: (angle: number) => void;
  onBulkDelete: () => void;
  onExportPdf: () => void;
  onExportMerge: () => void;
  onScrollToTop: () => void;
}

export const GridContextMenu = ({
  x,
  y,
  selectedCount,
  isExporting,
  isMerging,
  onClose,
  onSelectAll,
  onDeselectAll,
  onBulkRotate,
  onBulkDelete,
  onExportPdf,
  onExportMerge,
  onScrollToTop,
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
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 340);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-52 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl py-1.5 text-sm select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 1. 전체 선택 / 전체 해제 */}
      <button
        className={`w-full flex items-center gap-3 px-3.5 py-2 text-sm hover:bg-gray-100/80 transition-colors ${
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

      <div className="h-px bg-gray-100 my-1" />

      {/* 2. 회전 90° */}
      <button
        className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-100/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-100/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected}
        onClick={() => {
          onBulkRotate(-90);
          onClose();
        }}
      >
        <RotateCcw size={16} />
        <span>90° 반시계 회전</span>
      </button>

      <div className="h-px bg-gray-100 my-1" />

      {/* 4. 삭제 */}
      <button
        className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected}
        onClick={() => {
          onBulkDelete();
          onClose();
        }}
      >
        <Trash2 size={16} />
        <span>삭제</span>
      </button>

      <div className="h-px bg-gray-100 my-1" />

      {/* 5. PDF 다운로드 */}
      <button
        className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!anySelected || isExporting}
        onClick={() => {
          onExportPdf();
          onClose();
        }}
      >
        {isExporting ? (
          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <FileText size={16} />
        )}
        <span>{isExporting ? '생성 중...' : 'PDF 다운로드'}</span>
      </button>

      {/* 6. Merge 이미지 */}
      <button
        className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

      <div className="h-px bg-gray-100 my-1" />

      {/* 7. 맨 위로 가기 */}
      <button
        className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-100/80 transition-colors"
        onClick={() => {
          onScrollToTop();
          onClose();
        }}
      >
        <ArrowUp size={16} />
        <span>맨 위로 가기</span>
      </button>
    </div>
  );
};
