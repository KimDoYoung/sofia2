import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  ChevronLeft,
  RotateCw,
  RotateCcw,
  Trash2,
  CheckSquare,
  Square,
  FileText,
  LayoutGrid,
  List as ListIcon,
  Menu,
  Search,
  X,
  Layers,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

interface ListToolbarProps {
  onBack: () => void;
  folderName?: string;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkRotate: (angle: number) => void;
  onBulkDelete: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  onExportMerge: () => void;
  isMerging: boolean;
  viewMode: 'thumb' | 'smallThumb' | 'list';
  onViewModeChange: (mode: 'thumb' | 'smallThumb' | 'list') => void;
}

export const ListToolbar = ({
  onBack,
  folderName,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkRotate,
  onBulkDelete,
  onExportPdf,
  isExporting,
  onExportMerge,
  isMerging,
  viewMode,
  onViewModeChange,
}: ListToolbarProps) => {
  const { searchQuery, setSearchQuery } = useUIStore();
  const anySelected = selectedCount > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full"
        >
          <ChevronLeft size={24} />
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">{folderName ?? '이미지 목록'}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* ── 검색바 ── */}
        <div className="relative hidden sm:flex items-center bg-gray-50 p-1 rounded-lg border shadow-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="파일명 검색..."
            className="h-9 w-40 md:w-64 pl-9 pr-8 border-0 shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
              title="지우기"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Desktop: Control Box (md 이상에서만 표시) ── */}
        <div className="hidden md:flex bg-gray-50 p-1 rounded-lg border items-center gap-1 shadow-sm">
          {/* 전체 선택 / 해제 토글 */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={anySelected ? onDeselectAll : onSelectAll}
              className={`h-9 px-3 gap-2 ${anySelected
                ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              title={anySelected ? '전체 해제' : '전체 선택'}
            >
              {anySelected ? <CheckSquare size={16} /> : <Square size={16} />}
            </Button>
            {anySelected && (
              <span className="text-xs font-bold px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full mr-1 shrink-0 animate-in fade-in zoom-in duration-150">
                {selectedCount}개 선택
              </span>
            )}
          </div>
          <div className="w-px h-4 bg-gray-300 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            disabled={viewMode === 'list' || selectedCount === 0}
            onClick={() => onBulkRotate(90)}
            className="h-9 px-3 gap-2 text-gray-600"
            title="90도 시계방향 회전"
          >
            <RotateCw size={16} />
            <span className="hidden lg:inline">90°</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={viewMode === 'list' || selectedCount === 0}
            onClick={() => onBulkRotate(-90)}
            className="h-9 px-3 gap-2 text-gray-600"
            title="90도 반시계방향 회전"
          >
            <RotateCcw size={16} />
            <span className="hidden lg:inline">-90°</span>
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            disabled={selectedCount === 0}
            onClick={onBulkDelete}
            className="h-9 px-3 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="삭제"
          >
            <Trash2 size={16} />
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            disabled={selectedCount === 0 || isExporting}
            onClick={onExportPdf}
            className="h-9 px-3 gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="PDF로 다운로드"
          >
            {isExporting ? (
              <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            <span className="hidden lg:inline">{isExporting ? '생성 중...' : 'PDF'}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={selectedCount === 0 || isMerging}
            onClick={onExportMerge}
            className="h-9 px-3 gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            title="한 장의 이미지로 병합 다운로드"
          >
            {isMerging ? (
              <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Layers size={16} />
            )}
            <span className="hidden lg:inline">{isMerging ? '병합 중...' : 'Merge'}</span>
          </Button>
        </div>

        {/* ── Tablet/Mobile: 햄버거 드롭다운 (md 미만에서만 표시) ── */}
        <div className="relative md:hidden" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(prev => !prev)}
            className="rounded-lg border bg-gray-50 shadow-sm"
            title="메뉴"
          >
            <Menu size={20} />
          </Button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-white border rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-2">
              {/* 전체 선택 / 해제 */}
              <button
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                  anySelected ? 'text-green-600' : 'text-gray-600'
                }`}
                onClick={() => { if (anySelected) { onDeselectAll(); } else { onSelectAll(); } closeMenu(); }}
              >
                {anySelected ? <CheckSquare size={16} /> : <Square size={16} />}
                {anySelected ? '전체 해제' : '전체 선택'}
              </button>

              <div className="h-px bg-gray-100 mx-3 my-1" />

              {/* 회전 90° */}
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={viewMode === 'list' || selectedCount === 0}
                onClick={() => { onBulkRotate(90); closeMenu(); }}
              >
                <RotateCw size={16} />
                90° 회전
              </button>

              {/* 회전 -90° */}
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={viewMode === 'list' || selectedCount === 0}
                onClick={() => { onBulkRotate(-90); closeMenu(); }}
              >
                <RotateCcw size={16} />
                90° 반시계 회전
              </button>

              <div className="h-px bg-gray-100 mx-3 my-1" />

              {/* 삭제 */}
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={selectedCount === 0}
                onClick={() => { onBulkDelete(); closeMenu(); }}
              >
                <Trash2 size={16} />
                삭제
              </button>

              <div className="h-px bg-gray-100 mx-3 my-1" />

              {/* PDF */}
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={selectedCount === 0 || isExporting}
                onClick={() => { onExportPdf(); closeMenu(); }}
              >
                {isExporting ? (
                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                {isExporting ? '생성 중...' : 'PDF 다운로드'}
              </button>

              {/* Merge */}
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={selectedCount === 0 || isMerging}
                onClick={() => { onExportMerge(); closeMenu(); }}
              >
                {isMerging ? (
                  <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Layers size={16} />
                )}
                {isMerging ? '병합 중...' : 'Merge 이미지'}
              </button>
            </div>
          )}
        </div>

        {/* ── 뷰 모드 (항상 표시) ── */}
        <div className="flex bg-gray-100 p-1 rounded-lg border shadow-sm">
          <Button
            variant={viewMode === 'smallThumb' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('smallThumb')}
            className={viewMode === 'smallThumb' ? 'bg-white shadow-sm' : ''}
          >
            <LayoutGrid size={12} />
          </Button>
          <Button
            variant={viewMode === 'thumb' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('thumb')}
            className={viewMode === 'thumb' ? 'bg-white shadow-sm' : ''}
          >
            <LayoutGrid size={20} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('list')}
            className={viewMode === 'list' ? 'bg-white shadow-sm' : ''}
          >
            <ListIcon size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};
