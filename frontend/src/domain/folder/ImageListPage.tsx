import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { LayoutGrid, List as ListIcon, ChevronLeft, RotateCw, RotateCcw, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';

import { useUIStore } from '@/store/uiStore';
import { formatDateTime, formatFileSize } from '@/lib/utils';
import { ImageThumbCard1 } from '@/shared/components/ImageThumbCard1';
import { Button } from '@/shared/components/ui/button';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, SelectionChangedEvent } from 'ag-grid-community';
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

  const { data: images, isLoading } = useQuery<ImageFile[]>({
    queryKey: ['folder-images', folderId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/folder/${folderId}`);
      return res.data;
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      await apiClient.patch(`/images/${id}`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-images', folderId] });
      toast({ title: '성공', description: '노트가 수정되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '노트 수정 중 오류가 발생했습니다.', variant: 'destructive' });
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
    if (event.column.getColId() === 'note') {
      updateImageMutation.mutate({
        id: event.data.id,
        note: event.newValue
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
      cellRenderer: (params: any) => (
        <button
          className="text-blue-600 hover:underline font-medium"
          onClick={() => navigate(`/image/${params.data.id}`)}
        >
          {params.value}
        </button>
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
              <LayoutGrid size={20} /> {/* Ensure size is passed as an attribute */}
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => { setViewMode('list'); setSelectedIds([]); }}
              className={viewMode === 'list' ? 'bg-white shadow-sm' : ''}
            >
              <ListIcon size={20} /> {/* Ensure size is passed as an attribute */}
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
              onRename={() => console.log('Rename', img.id)}
              onAddNote={() => console.log('Add Note', img.id)}
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
              onRename={() => console.log('Rename', img.id)}
              onAddNote={() => console.log('Add Note', img.id)}
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
            enterMovesDownAfterEdit={true}
            singleClickEdit={false}
            rowHeight={80}
          />
        </div>
      )}
    </div>
  );
};

export default ImageListPage;
