import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/shared/components/ui/use-toast';

// AgGrid imports
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';

// Icons
import { 
  Trash2, 
  Plus, 
  RefreshCw,
  FolderTree,
  Table
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

// Components
import FolderTreeView from './components/FolderTreeView';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface ImageFolder {
  id: number;
  folderName: string;
  lastLoadTime: string;
  note: string;
}

const FolderListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // View mode state ('tree' or 'list') - stored in localStorage
  const [viewMode, setViewMode] = useState<'tree' | 'list'>(() => {
    return (localStorage.getItem('folderViewMode') as 'tree' | 'list') || 'tree';
  });

  // Save viewMode preference
  useEffect(() => {
    localStorage.setItem('folderViewMode', viewMode);
  }, [viewMode]);

  const { data: folders, isLoading, refetch, isRefetching } = useQuery<ImageFolder[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await apiClient.get('/folders');
      return res.data;
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      await apiClient.put(`/folders/${id}/note`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast({ title: '성공', description: '비고가 수정되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '비고 수정 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast({ title: '성공', description: '폴더 정보가 삭제되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '폴더 삭제 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  });

  const handleUpdateNote = useCallback((id: number, note: string) => {
    updateNoteMutation.mutate({ id, note });
  }, [updateNoteMutation]);

  const handleDelete = useCallback((id: number, folderName: string) => {
    if (window.confirm(`'${folderName}' 폴더 정보를 삭제하시겠습니까?\n(실제 폴더는 삭제되지 않으며 썸네일만 삭제됩니다.)`)) {
      deleteFolderMutation.mutate(id);
    }
  }, [deleteFolderMutation]);

  // AG Grid Specific event handler
  const onCellValueChanged = (event: CellValueChangedEvent) => {
    if (event.column.getColId() === 'note') {
      updateNoteMutation.mutate({
        id: event.data.id,
        note: event.newValue
      });
    }
  };

  // AG Grid Column definitions
  const columnDefs: ColDef<ImageFolder>[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80 },
    {
      field: 'folderName',
      headerName: '폴더명',
      flex: 1,
      cellRenderer: (params: ICellRendererParams<ImageFolder>) => (
        <button
          className="text-blue-600 hover:underline font-medium"
          onClick={() => navigate(`/folder/${params.data?.id}`)}
        >
          {params.value}
        </button>
      ),
      filter: true
    },
    {
      field: 'lastLoadTime',
      headerName: '마지막 로드 시간',
      width: 220,
      valueFormatter: (params: ValueFormatterParams<ImageFolder>) => params.value ? formatDate(params.value) : '',
      filter: false
    },
    {
      field: 'note',
      headerName: '비고',
      flex: 1,
      editable: true,
      cellEditor: 'agTextCellEditor',
      filter: true
    },
    {
      headerName: '삭제',
      width: 70,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<ImageFolder>) => (
        <button
          title="폴더 삭제"
          onClick={() => {
            if (params.data) {
              handleDelete(params.data.id, params.data.folderName);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid #fca5a5',
            background: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#ef4444';
            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(239,68,68,0.35)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
      ),
      filter: false
    },
  ], [navigate, handleDelete]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <span className="text-gray-500 text-sm">폴더 정보를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-950 tracking-tight flex items-center gap-2">
            📂 등록 폴더 목록
            {folders && (
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                총 {folders.length}개 폴더
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            등록된 이미지 폴더를 탐색하고 관리합니다.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented View Switcher */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-inner">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <FolderTree size={14} />
              트리형
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Table size={14} />
              리스트형 (AgGrid)
            </button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="text-gray-600 border-gray-200"
            >
              <RefreshCw size={14} className={`mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/folder/add')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <Plus size={16} className="mr-1.5" />
              폴더 추가
            </Button>
          </div>
        </div>
      </div>

      {/* Conditionally Render Content based on viewMode */}
      {viewMode === 'tree' ? (
        <FolderTreeView 
          folders={folders || []} 
          onUpdateNote={handleUpdateNote} 
          onDeleteFolder={handleDelete}
          isUpdatingNote={updateNoteMutation.isPending}
        />
      ) : (
        /* Restore original AG Grid list view */
        <div className="w-full h-[600px] shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <AgGridReact
            theme={themeQuartz}
            rowData={folders}
            columnDefs={columnDefs}
            defaultColDef={{
              sortable: true,
              filter: false,
              resizable: true,
            }}
            pagination={true}
            paginationPageSize={20}
            onCellValueChanged={onCellValueChanged}
            singleClickEdit={false}
          />
        </div>
      )}
    </div>
  );
};

export default FolderListPage;
