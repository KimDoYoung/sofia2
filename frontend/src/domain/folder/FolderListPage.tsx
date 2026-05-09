import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { useToast } from '@/shared/components/ui/use-toast';
import { Trash2 } from 'lucide-react';

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

  const { data: folders, isLoading } = useQuery<ImageFolder[]>({
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

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    if (event.column.getColId() === 'note') {
      updateNoteMutation.mutate({
        id: event.data.id,
        note: event.newValue
      });
    }
  };

  const handleDelete = (id: number, folderName: string) => {
    if (window.confirm(`'${folderName}' 폴더 정보를 삭제하시겠습니까?\n(실제 폴더는 삭제되지 않으며 썸네일만 삭제됩니다.)`)) {
      deleteFolderMutation.mutate(id);
    }
  };

  const columnDefs: ColDef<ImageFolder>[] = [
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
  ];

  if (isLoading) return <div className="p-8 text-center">Loading folders...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">폴더 목록</h2>
      </div>

      <div className="w-full h-[600px] shadow-sm rounded-lg overflow-hidden">
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
    </div>
  );
};

export default FolderListPage;
