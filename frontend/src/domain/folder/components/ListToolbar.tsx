import { Button } from '@/shared/components/ui/button';
import { 
  ChevronLeft, 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  CheckSquare, 
  Square, 
  FileText, 
  LayoutGrid, 
  List as ListIcon 
} from 'lucide-react';

interface ListToolbarProps {
  onBack: () => void;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkRotate: (angle: number) => void;
  onBulkDelete: () => void;
  onExportPdf: () => void;
  viewMode: 'thumb' | 'smallThumb' | 'list';
  onViewModeChange: (mode: 'thumb' | 'smallThumb' | 'list') => void;
}

export const ListToolbar = ({
  onBack,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkRotate,
  onBulkDelete,
  onExportPdf,
  viewMode,
  onViewModeChange,
}: ListToolbarProps) => {
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
        <h2 className="text-2xl font-bold text-gray-800">이미지 목록</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* 전체 선택 및 전체 해제 버튼 */}
        <div className="flex bg-gray-50 p-1 rounded-lg border items-center gap-1 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="h-9 px-3 gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="전체 선택"
          >
            <CheckSquare size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="h-9 px-3 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="전체 해제"
          >
            <Square size={16} />
          </Button>
        </div>

        {/* Control Box */}
        <div className="flex bg-gray-50 p-1 rounded-lg border items-center gap-1 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            disabled={viewMode === 'list' || selectedCount === 0}
            onClick={() => onBulkRotate(90)}
            className="h-9 px-3 gap-2 text-gray-600"
            title="90도 시계방향 회전"
          >
            <RotateCw size={16} />
            <span className="hidden sm:inline">90°</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={viewMode === 'list' || selectedCount === 0}
            onClick={() => onBulkRotate(180)}
            className="h-9 px-3 gap-2 text-gray-600"
            title="180도 회전"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">180°</span>
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
            <span className="hidden sm:inline">삭제</span>
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            disabled={selectedCount === 0}
            onClick={onExportPdf}
            className="h-9 px-3 gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="PDF로 다운로드"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>

        {/* 리스트 표현 형식 */}
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
