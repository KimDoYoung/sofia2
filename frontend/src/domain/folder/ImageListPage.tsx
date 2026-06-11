import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useState, useRef, useEffect, useMemo } from 'react';

import { useUIStore } from '@/store/uiStore';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { CellValueChangedEvent, SelectionChangedEvent } from 'ag-grid-community';
import { useToast } from '@/shared/components/ui/use-toast';
import { useImageActions } from '@/shared/hooks/useImageActions';
import { ArrowUp, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

import type { ImageFile } from './types';
import { ListToolbar } from './components/ListToolbar';
import { ImageGridView } from './components/ImageGridView';
import { ImageListView } from './components/ImageListView';
import { ExportOptionsModal } from './components/ExportOptionsModal';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const ImageListPage = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { copyLink } = useImageActions();
  const { imageListViewMode: viewMode, setImageListViewMode: setViewMode, searchQuery, setSearchQuery } = useUIStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [exportModalType, setExportModalType] = useState<'pdf' | 'merge' | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const gridRef = useRef<AgGridReact>(null);

  // Reset search when folder changes
  useEffect(() => {
    setSearchQuery('');
  }, [folderId, setSearchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { data: images, isLoading } = useQuery<ImageFile[]>({
    queryKey: ['folder-images', folderId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/folder/${folderId}`);
      return res.data;
    },
  });

  const filteredImages = useMemo(() => {
    if (!images) return [];
    if (!searchQuery) return images;
    return images.filter(img => 
      img.orgName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [images, searchQuery]);

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
      setSelectedIds(filteredImages.map(img => img.id));
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


  const handleExportPdf = async (options: { imagesPerPage?: number; orientation?: string }) => {
    if (selectedIds.length === 0) return;
    setIsExporting(true);
    try {
      const response = await apiClient.post('/images/export/pdf', { 
        ids: selectedIds,
        imagesPerPage: options.imagesPerPage,
        orientation: options.orientation
      }, {
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

  const handleMergeImages = async (options: { mode?: string; cols?: number | null; gap?: number }) => {
    if (selectedIds.length === 0) return;
    setIsMerging(true);
    try {
      const response = await apiClient.post('/images/export/merge', { 
        ids: selectedIds,
        mode: options.mode,
        cols: options.cols,
        gap: options.gap
      }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `sofia_merged_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.jpg`;
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
      toast({ title: '성공', description: '병합 이미지가 생성되었습니다.' });
    } catch {
      toast({ title: '오류', description: '이미지 병합 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsMerging(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading images...</div>;

  return (
    <div className="space-y-2">
      <ListToolbar 
        onBack={() => navigate('/')}
        folderName={folderName}
        selectedCount={selectedIds.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBulkRotate={handleBulkRotate}
        onBulkDelete={handleBulkDelete}
        onExportPdf={() => setExportModalType('pdf')}
        isExporting={isExporting}
        onExportMerge={() => setExportModalType('merge')}
        isMerging={isMerging}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setSelectedIds([]);
        }}
      />

      {filteredImages.length === 0 && searchQuery ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">검색 결과가 없습니다</h3>
          <p className="text-gray-500 mt-1">
            "{searchQuery}"에 해당하는 파일을 찾을 수 없습니다.
          </p>
          <Button
            variant="link"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-blue-600"
          >
            필터 초기화
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        <ImageListView 
          images={filteredImages}
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
          images={filteredImages}
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

      {showScrollTop && viewMode !== 'list' && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all animate-in fade-in zoom-in duration-300"
          title="맨 위로"
        >
          <ArrowUp size={24} />
        </button>
      )}

      <ExportOptionsModal
        isOpen={exportModalType !== null}
        onClose={() => setExportModalType(null)}
        type={exportModalType || 'pdf'}
        isProcessing={isExporting || isMerging}
        onConfirm={async (options) => {
          if (exportModalType === 'pdf') {
            await handleExportPdf(options);
          } else {
            await handleMergeImages(options);
          }
          setExportModalType(null);
        }}
      />
    </div>
  );
};

export default ImageListPage;
