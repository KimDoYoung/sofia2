import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useState, useRef } from 'react';

import { useUIStore } from '@/store/uiStore';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { CellValueChangedEvent, SelectionChangedEvent } from 'ag-grid-community';
import { useToast } from '@/shared/components/ui/use-toast';
import { useImageActions } from '@/shared/hooks/useImageActions';

import type { ImageFile } from './types';
import { ListToolbar } from './components/ListToolbar';
import { ImageGridView } from './components/ImageGridView';
import { ImageListView } from './components/ImageListView';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const ImageListPage = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { copyLink } = useImageActions();
  const { imageListViewMode: viewMode, setImageListViewMode: setViewMode } = useUIStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const gridRef = useRef<AgGridReact>(null);

  const { data: images, isLoading } = useQuery<ImageFile[]>({
    queryKey: ['folder-images', folderId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/folder/${folderId}`);
      return res.data;
    },
  });

  const { data: folders } = useQuery<{ id: number; folderName: string }[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await apiClient.get('/folders');
      return res.data;
    },
  });

  const currentFolder = folders?.find(f => f.id === Number(folderId));
  const folderName = currentFolder?.folderName;

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


  const handleExportPdf = async () => {
    if (selectedIds.length === 0) return;
    const selected_image_count = selectedIds.length;
    if (!confirm(`선택한 ${selected_image_count}개의 이미지를 PDF로 다운로드하시겠습니까?`)) return;
    
    setIsExporting(true);
    try {
      const response = await apiClient.post('/images/export/pdf', { ids: selectedIds }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `sofia_images_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: '성공', description: 'PDF 파일이 생성되었습니다.' });
    } catch {
      toast({ title: '오류', description: 'PDF 생성 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading images...</div>;

  return (
    <div className="space-y-2">
      <ListToolbar 
        onBack={() => navigate('/')}
        folderName={folderName}
        totalCount={images?.length ?? 0}
        selectedCount={selectedIds.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBulkRotate={handleBulkRotate}
        onBulkDelete={handleBulkDelete}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setSelectedIds([]);
        }}
      />

      {viewMode === 'list' ? (
        <ImageListView 
          images={images || []}
          gridRef={gridRef}
          refreshKey={refreshKey}
          onSelectionChanged={onSelectionChanged}
          onCellValueChanged={onCellValueChanged}
          onImageClick={(id) => navigate(`/image/${id}`)}
          onCopyLink={copyLink}
          onDelete={(id) => {
            if (window.confirm('삭제하시겠습니까?')) bulkDeleteMutation.mutate([id]);
          }}
        />
      ) : (
        <ImageGridView 
          images={images || []}
          viewMode={viewMode}
          selectedIds={selectedIds}
          refreshKey={refreshKey}
          onImageClick={(id) => navigate(`/image/${id}`)}
          onSelect={handleSelect}
          onRename={handleRename}
          onAddNote={handleAddNote}
          onDelete={(id) => {
            if (window.confirm('삭제하시겠습니까?')) bulkDeleteMutation.mutate([id]);
          }}
          onRotate={(id, angle) => rotateMutation.mutate({ ids: [id], angle })}
        />
      )}
    </div>
  );
};

export default ImageListPage;
