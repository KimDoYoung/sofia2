import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { LayoutGrid, List as ListIcon, ChevronLeft, RotateCw, RotateCcw, Trash2, Check, X } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';

import { useUIStore } from '@/store/uiStore';
import { formatDateTime, formatFileSize } from '@/lib/utils';
import { ImageThumbCard1 } from '@/shared/components/ImageThumbCard1';
import { Button } from '@/shared/components/ui/button';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, SelectionChangedEvent, ValueSetterParams } from 'ag-grid-community';
import { useToast } from '@/shared/components/ui/use-toast';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface ImageFile {
  id: number;
  orgName: string;
  imageFormat: string;
  imageWidth: number;
  imageHeight: number;
  captureDateTime: string;
  fileSize: number;
  note?: string;
}

const ImageListPage = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { imageListViewMode: viewMode, setImageListViewMode: setViewMode } = useUIStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const gridRef = useRef<AgGridReact>(null);

  const { data: images, isLoading } = useQuery<ImageFile[]>({
    queryKey: ['folder-images', folderId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/folder/${folderId}`);
      return res.data;
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ id, note, orgName }: { id: number; note?: string; orgName?: string }) => {
      await apiClient.patch(`/images/${id}`, { note, orgName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-images', folderId] });
      toast({ title: '성공', description: '이미지 정보가 수정되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '수정 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiClient.delete('/images', { data: { ids } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-images', folderId] });
      setSelectedIds([]);
      toast({ title: '성공', description: '선택된 이미지가 삭제되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '이미지 삭제 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  });

  const rotateMutation = useMutation({
    mutationFn: async ({ ids, angle }: { ids: number[], angle: number }) => {
      await apiClient.post('/images/rotate', { ids, angle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-images', folderId] });
      setRefreshKey(Date.now());
      toast({ title: '성공', description: '이미지가 회전되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '이미지 회전 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  });

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    const field = event.column.getColId();
    if (field === 'note' || field === 'orgName') {
      updateImageMutation.mutate({
        id: event.data.id,
        [field]: event.newValue
      });
    }
  };

  const onSelectionChanged = (event: SelectionChangedEvent) => {
    const selectedNodes = event.api.getSelectedNodes();
    const ids = selectedNodes.map(node => node.data.id);
    setSelectedIds(ids);
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (viewMode === 'list' && gridRef.current?.api) {
      gridRef.current.api.selectAll();
    } else {
      setSelectedIds(images?.map(img => img.id) || []);
    }
  };

  const handleDeselectAll = () => {
    if (viewMode === 'list' && gridRef.current?.api) {
      gridRef.current.api.deselectAll();
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`선택한 ${selectedIds.length}개의 이미지를 삭제하시겠습니까?\n(원본 파일과 썸네일이 모두 삭제됩니다.)`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const handleBulkRotate = (angle: number) => {
    if (selectedIds.length === 0) return;
    rotateMutation.mutate({ ids: selectedIds, angle });
  };

  const handleRename = (id: number, currentName: string) => {
    const dotIndex = currentName.lastIndexOf('.');
    const nameWithoutExt = dotIndex !== -1 ? currentName.substring(0, dotIndex) : currentName;
    const ext = dotIndex !== -1 ? currentName.substring(dotIndex) : '';
    
    const newNameWithoutExt = window.prompt('새 파일명을 입력하세요 (확장자 제외):', nameWithoutExt);
    if (newNameWithoutExt !== null && newNameWithoutExt.trim() !== '') {
      updateImageMutation.mutate({ id, orgName: newNameWithoutExt.trim() + ext });
    }
  };

  const handleAddNote = (id: number, currentNote?: string) => {
    const newNote = window.prompt('노트를 입력하세요:', currentNote || '');
    if (newNote !== null) {
      updateImageMutation.mutate({ id, note: newNote.trim() });
    }
  };

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      sortable: false,
      filter: false,
      checkboxSelection: true,
      headerCheckboxSelection: true,
    },
    {
      headerName: '미리보기',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => (
        <img
          src={`/sofia/api/images/${params.data.id}/thumb?t=${refreshKey}`}
          className="w-16 h-16 object-cover rounded shadow-sm"
        />
      )
    },
    {
      field: 'orgName',
      headerName: '파일명',
      flex: 1,
      sortable: true,
      editable: true,
      cellEditor: 'agTextCellEditor',
      valueSetter: (params: ValueSetterParams) => {
        const newValue = params.newValue;
        if (!newValue || newValue.trim() === '') return false;
        
        const currentName = params.data.orgName;
        const dotIndex = currentName.lastIndexOf('.');
        const ext = dotIndex !== -1 ? currentName.substring(dotIndex) : '';
        
        // Ensure extension is preserved if missing in newValue
        let finalValue = newValue.trim();
        if (ext && !finalValue.toLowerCase().endsWith(ext.toLowerCase())) {
          finalValue += ext;
        }
        
        params.data.orgName = finalValue;
        return true;
      },
      cellRenderer: (params: any) => (
        <div className="flex items-center w-full justify-between group/cell">
          <button
            className="text-blue-600 hover:underline font-medium truncate"
            onClick={() => navigate(`/image/${params.data.id}`)}
          >
            {params.value}
          </button>
        </div>
      )
    },
    { field: 'imageFormat', headerName: '포맷', width: 100, sortable: false, filter: false, valueFormatter: (p: any) => p.value?.toUpperCase() },
    {
      headerName: '해상도',
      width: 140,
      sortable: false,
      filter: false,
      valueGetter: (p: any) => `${p.data.imageWidth} x ${p.data.imageHeight}`
    },
    {
      field: 'fileSize',
      headerName: '파일용량',
      width: 120,
      sortable: true,
      valueFormatter: (p: any) => formatFileSize(p.value),
      type: 'rightAligned'
    },
    {
      field: 'captureDateTime',
      headerName: '촬영일시',
      width: 220,
      sortable: true,
      valueFormatter: (p: any) => formatDateTime(p.value)
    },
    {
      field: 'note',
      headerName: '노트',
      flex: 1,
      editable: true,
      cellEditor: 'agTextCellEditor'
    },
  ], [navigate, refreshKey]);

  if (isLoading) return <div className="p-8 text-center">Loading images...</div>;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
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
              onClick={handleSelectAll}
              className="h-9 px-3 gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="전체 선택"
            >
              <Check size={16} />
              <span className="hidden sm:inline">전체 선택</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              className="h-9 px-3 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="전체 해제"
            >
              <X size={16} />
              <span className="hidden sm:inline">전체 해제</span>
            </Button>
          </div>
          {/* Control Box */}
          <div className="flex bg-gray-50 p-1 rounded-lg border items-center gap-1 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              disabled={viewMode === 'list' || selectedIds.length === 0}
              onClick={() => handleBulkRotate(90)}
              className="h-9 px-3 gap-2 text-gray-600"
              title="90도 시계방향 회전"
            >
              <RotateCw size={16} />
              <span className="hidden sm:inline">90°</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={viewMode === 'list' || selectedIds.length === 0}
              onClick={() => handleBulkRotate(180)}
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
              disabled={selectedIds.length === 0}
              onClick={handleBulkDelete}
              className="h-9 px-3 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="삭제"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">삭제</span>
            </Button>
          </div>

          {/* 리스트 표현 형식 */}
          <div className="flex bg-gray-100 p-1 rounded-lg border shadow-sm">
            <Button
              variant={viewMode === 'smallThumb' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => { setViewMode('smallThumb'); setSelectedIds([]); }}
              className={viewMode === 'smallThumb' ? 'bg-white shadow-sm' : ''}
            >
              <LayoutGrid size={12} />
            </Button>
            <Button
              variant={viewMode === 'thumb' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => { setViewMode('thumb'); setSelectedIds([]); }}
              className={viewMode === 'thumb' ? 'bg-white shadow-sm' : ''}
            >
              <LayoutGrid size={20} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => { setViewMode('list'); setSelectedIds([]); }}
              className={viewMode === 'list' ? 'bg-white shadow-sm' : ''}
            >
              <ListIcon size={20} />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'thumb' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
          {images?.map((img) => (
            <ImageThumbCard1
              key={img.id}
              image={img}
              isSelected={selectedIds.includes(img.id)}
              refreshKey={refreshKey}
              onImageClick={(id) => navigate(`/image/${id}`)}
              onSelect={handleSelect}
              onRename={() => handleRename(img.id, img.orgName)}
              onAddNote={() => handleAddNote(img.id, img.note)}
              onDelete={() => {
                if (window.confirm('삭제하시겠습니까?')) bulkDeleteMutation.mutate([img.id]);
              }}
              onRotate={(id, angle) => rotateMutation.mutate({ ids: [id], angle })}
            />
          ))}
        </div>
      ) : viewMode === 'smallThumb' ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {images?.map((img) => (
            <ImageThumbCard1
              key={img.id}
              image={img}
              isSelected={selectedIds.includes(img.id)}
              refreshKey={refreshKey}
              onImageClick={(id) => navigate(`/image/${id}`)}
              onSelect={handleSelect}
              onRename={() => handleRename(img.id, img.orgName)}
              onAddNote={() => handleAddNote(img.id, img.note)}
              onDelete={() => {
                if (window.confirm('삭제하시겠습니까?')) bulkDeleteMutation.mutate([img.id]);
              }}
              onRotate={(id, angle) => rotateMutation.mutate({ ids: [id], angle })}
            />
          ))}
        </div>
      ) : (
        <div className="w-full h-[650px] shadow-sm rounded-lg overflow-hidden border">
          <AgGridReact
            ref={gridRef}
            theme={themeQuartz}
            rowData={images}
            columnDefs={columnDefs}
            defaultColDef={{
              sortable: false,
              filter: true,
              resizable: true,
              cellStyle: { display: 'flex', alignItems: 'center' }
            }}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            onSelectionChanged={onSelectionChanged}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[7, 10, 15, 20, 30]}
            onCellValueChanged={onCellValueChanged}
            singleClickEdit={false}
            rowHeight={80}
          />
        </div>
      )}
    </div>
  );
};

export default ImageListPage;
