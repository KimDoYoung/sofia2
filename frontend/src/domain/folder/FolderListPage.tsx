import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';

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

  const { data: folders, isLoading } = useQuery<ImageFolder[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await apiClient.get('/folders');
      return res.data;
    },
  });

  const columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    {
      field: 'folderName',
      headerName: '폴더명',
      flex: 1,
      cellRenderer: (params: any) => (
        <button
          className="text-blue-600 hover:underline font-medium"
          onClick={() => navigate(`/folder/${params.data.id}`)}
        >
          {params.value}
        </button>
      )
    },
    { 
      field: 'lastLoadTime', 
      headerName: '마지막 로드 시간', 
      width: 220,
      valueFormatter: (params: any) => formatDate(params.value)
    },
    { field: 'note', headerName: '비고', flex: 1 },
    {
      headerName: '삭제',
      width: 100,
      cellRenderer: (params: any) => (
        <button
          className="bg-red-500 text-white px-2 py-1 rounded"
          onClick={() => console.log(`Deleting folder with ID: ${params.data.id}`)}
        >
          삭제
        </button>
      )
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
            filter: true,
            resizable: true,
          }}
          pagination={true}
          paginationPageSize={20}
        />
      </div>
    </div>
  );
};

export default FolderListPage;
