import { useMemo, useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/shared/components/ui/use-toast';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type {
  ColDef,
  CellValueChangedEvent,
  ICellRendererParams,
  ValueFormatterParams,
  GetRowIdParams,
} from 'ag-grid-community';
import { Trash2, Download, RefreshCw, Archive, Search, Eye, Globe, Lock, Link2, RotateCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { formatElapsed } from '@/shared/utils/elapsedTime';
import { ArchivePreviewModal } from './ArchivePreviewModal';

ModuleRegistry.registerModules([AllCommunityModule]);

interface ArchivedOutput {
  id: number;
  type: string;
  storedFilename: string;
  displayFilename: string;
  note: string | null;
  sourceFolderId: number | null;
  fileSize: number;
  fileExtension: string;
  elapsedMs: number | null;
  createdAt: string;
  isPublic: boolean;
  shareKey: string;
}

const TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'PDF', label: '📄 PDF' },
  { value: 'MERGE', label: '🖼️ 병합' },
  { value: 'COLLAGE', label: '✨ 콜라쥬' },
  { value: 'EFFECT', label: '🎨 효과' },
  { value: 'SLIDESHOW', label: '🎬 슬라이드쇼' },
];

const TYPE_LABELS: Record<string, string> = {
  PDF: '📄 PDF',
  MERGE: '🖼️ 병합',
  COLLAGE: '✨ 콜라쥬',
  EFFECT: '🎨 효과',
  SLIDESHOW: '🎬 슬라이드쇼',
};

const ArchiveListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const gridRef = useRef<AgGridReact>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [previewItem, setPreviewItem] = useState<ArchivedOutput | null>(null);

  const { data: items, isLoading, refetch, isRefetching } = useQuery<ArchivedOutput[]>({
    queryKey: ['archive'],
    queryFn: async () => {
      const res = await apiClient.get('/archive');
      return res.data;
    },
  });

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = items;
    if (typeFilter) result = result.filter(item => item.type === typeFilter);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(item =>
        item.displayFilename.toLowerCase().includes(q) ||
        (item.note?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [items, typeFilter, searchText]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, note, displayFilename, isPublic }: { id: number; note?: string | null; displayFilename?: string; isPublic?: boolean }) => {
      await apiClient.patch(`/archive/${id}`, { note, displayFilename, isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive'] });
    },
    onError: () => {
      toast({ title: '오류', description: '수정 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const reissueMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(`/archive/${id}/reissue-share-key`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive'] });
      toast({ title: '성공', description: '새로운 공유 링크가 발급되었습니다. 이전 링크는 무효화됩니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '링크 재발급 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const handleTogglePublic = useCallback((item: ArchivedOutput) => {
    const nextPublic = !item.isPublic;
    updateMutation.mutate(
      { id: item.id, isPublic: nextPublic },
      {
        onSuccess: () => {
          toast({
            title: nextPublic ? '공개 설정 완료' : '비공개 설정 완료',
            description: nextPublic
              ? `'${item.displayFilename}' 외부 공유 링크가 활성화되었습니다.`
              : `'${item.displayFilename}' 외부 공유 링크가 비활성화되었습니다.`,
          });
        },
      }
    );
  }, [updateMutation, toast]);

  const handleCopyShareLink = useCallback(async (shareKey: string) => {
    const url = `${window.location.origin}/sofia/archive/share/${shareKey}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast({ title: '복사 완료', description: '공유 링크가 클립보드에 복사되었습니다.' });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: '오류', description: '링크 복사에 실패했습니다.', variant: 'destructive' });
    }
  }, [toast]);

  const handleReissueShareKey = useCallback((item: ArchivedOutput) => {
    if (window.confirm(`'${item.displayFilename}'의 공유 링크를 새로 발급하시겠습니까?\n기존에 공유된 링크는 즉시 무효화됩니다.`)) {
      reissueMutation.mutate(item.id);
    }
  }, [reissueMutation]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/archive/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive'] });
      toast({ title: '성공', description: '삭제되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '삭제 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const handleDelete = useCallback((id: number, displayFilename: string) => {
    if (window.confirm(`'${displayFilename}' 항목을 보관소에서 삭제하시겠습니까?\n(실제 파일도 함께 삭제됩니다.)`)) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleBulkDelete = () => {
    const selected = gridRef.current?.api.getSelectedRows() as ArchivedOutput[] | undefined;
    if (!selected?.length) return;
    if (window.confirm(`선택한 ${selected.length}개 항목을 삭제하시겠습니까?`)) {
      selected.forEach(row => deleteMutation.mutate(row.id));
    }
  };

  const handleDownload = useCallback(async (id: number, displayFilename: string) => {
    try {
      const response = await apiClient.get(`/archive/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', displayFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: '오류', description: '다운로드에 실패했습니다.', variant: 'destructive' });
    }
  }, [toast]);

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    const field = event.column.getColId();
    if (field === 'displayFilename' || field === 'note') {
      updateMutation.mutate({ id: event.data.id, [field]: event.newValue });
    }
  };

  const columnDefs: ColDef<ArchivedOutput>[] = useMemo(() => {
    const cols: ColDef<ArchivedOutput>[] = [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        pinned: 'left',
        resizable: false,
        sortable: false,
        filter: false,
      },
    {
      field: 'type',
      headerName: '종류',
      width: 120,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<ArchivedOutput>) => TYPE_LABELS[p.value] ?? p.value,
    },
    {
      field: 'displayFilename',
      headerName: '파일명',
      flex: 1.5,
      editable: true,
      cellEditor: 'agTextCellEditor',
      filter: false,
    },
    {
      field: 'isPublic',
      headerName: '공개 여부',
      width: 105,
      sortable: true,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<ArchivedOutput>) => {
        if (!params.data) return null;
        const isPub = params.data.isPublic;
        return (
          <button
            type="button"
            onClick={() => params.data && handleTogglePublic(params.data)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isPub
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
            title={isPub ? '클릭 시 비공개로 전환합니다' : '클릭 시 공개로 전환합니다'}
          >
            {isPub ? <Globe size={11} className="shrink-0" /> : <Lock size={11} className="shrink-0" />}
            <span>{isPub ? '공개' : '비공개'}</span>
          </button>
        );
      },
    },
    {
      field: 'note',
      headerName: '메모',
      flex: 1,
      editable: true,
      cellEditor: 'agTextCellEditor',
      filter: false,
      valueFormatter: (p: ValueFormatterParams<ArchivedOutput>) => p.value ?? '',
    },
    {
      field: 'sourceFolderId',
      headerName: '원본 폴더',
      width: 110,
      filter: false,
      cellRenderer: (params: ICellRendererParams<ArchivedOutput>) =>
        params.value ? (
          <button
            className="text-blue-600 hover:underline text-sm font-medium"
            onClick={() => navigate(`/folder/${params.value}`)}
          >
            #{params.value}
          </button>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        ),
    },
    {
      field: 'createdAt',
      headerName: '생성일시',
      width: 160,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<ArchivedOutput>) => formatDate(p.value),
    },
    {
      field: 'fileSize',
      headerName: '크기',
      width: 100,
      filter: false,
      headerClass: 'ag-right-aligned-header',
      cellStyle: { textAlign: 'right' },
      valueFormatter: (p: ValueFormatterParams<ArchivedOutput>) => formatFileSize(p.value),
    },
    {
      field: 'elapsedMs',
      headerName: '소요 시간',
      width: 110,
      filter: false,
      headerClass: 'ag-right-aligned-header',
      cellStyle: { textAlign: 'right' },
      valueFormatter: (p: ValueFormatterParams<ArchivedOutput>) => p.value ? formatElapsed(p.value) : '-',
    },
    {
      headerName: '액션',
      width: 180,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '8px' },
      cellRenderer: (params: ICellRendererParams<ArchivedOutput>) => {
        if (!params.data) return null;
        const item = params.data;
        const isPub = item.isPublic;

        return (
          <div className="flex items-center gap-1">
            {/* 미리보기 */}
            <button
              title="미리보기"
              onClick={() => setPreviewItem(item)}
              className="w-7 h-7 rounded-md border border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Eye size={14} strokeWidth={2} />
            </button>

            {/* 다운로드 */}
            <button
              title="다운로드"
              onClick={() => handleDownload(item.id, item.displayFilename)}
              className="w-7 h-7 rounded-md border border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Download size={14} strokeWidth={2} />
            </button>

            {/* 삭제 */}
            <button
              title="보관소에서 삭제"
              onClick={() => handleDelete(item.id, item.displayFilename)}
              className="w-7 h-7 rounded-md border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>

            {/* 공유 링크 복사 */}
            {isPub ? (
              <button
                title="공유 링크 복사"
                onClick={() => handleCopyShareLink(item.shareKey)}
                className="w-7 h-7 rounded-md border border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 flex items-center justify-center cursor-pointer transition-colors"
              >
                <Link2 size={14} strokeWidth={2} />
              </button>
            ) : (
              <button
                title="비공개 상태입니다 (먼저 공개로 설정해주세요)"
                disabled
                className="w-7 h-7 rounded-md border border-gray-200 text-gray-300 flex items-center justify-center cursor-not-allowed bg-gray-50/50"
              >
                <Link2 size={14} strokeWidth={2} />
              </button>
            )}

            {/* 새 링크 재발급 (공개 시에만 활성화) */}
            {isPub && (
              <button
                title="새 링크로 재발급 (이전 링크 무효화)"
                onClick={() => handleReissueShareKey(item)}
                className="w-7 h-7 rounded-md border border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400 flex items-center justify-center cursor-pointer transition-colors"
              >
                <RotateCw size={13} strokeWidth={2} />
              </button>
            )}
          </div>
        );
      },
    },
  ];
  return cols;
}, [handleDelete, handleDownload, handleTogglePublic, handleCopyShareLink, handleReissueShareKey, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <span className="text-gray-500 text-sm">보관소를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1680px] w-full mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-950 tracking-tight flex items-center gap-2">
            <Archive size={24} className="text-emerald-600" />
            보관소
            {items && (
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                총 {items.length}개 {filteredItems.length !== items.length && `(필터: ${filteredItems.length}개)`}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            생성된 PDF, 병합, 콜라쥬, 효과, 슬라이드쇼 파일을 관리합니다. 파일명과 메모는 셀을 더블클릭하여 편집할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={14} className="mr-1.5" />
            선택 삭제
          </Button>
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
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
        {/* Type radio */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider shrink-0">종류</span>
          {TYPE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                name="archiveType"
                value={opt.value}
                checked={typeFilter === opt.value}
                onChange={() => setTypeFilter(opt.value)}
                className="accent-emerald-600 cursor-pointer"
              />
              <span className={`text-sm font-medium ${typeFilter === opt.value ? 'text-emerald-700' : 'text-gray-600'}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2" />

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="파일명 또는 메모로 검색..."
            className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 min-w-0"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
            >
              지우기
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="w-full h-[560px] shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <AgGridReact
          ref={gridRef}
          theme={themeQuartz}
          rowData={filteredItems}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: false,
            resizable: true,
          }}
          rowSelection="multiple"
          pagination={true}
          paginationPageSize={25}
          onCellValueChanged={onCellValueChanged}
          singleClickEdit={false}
          getRowId={(params: GetRowIdParams<ArchivedOutput>) => String(params.data.id)}
        />
      </div>

      <ArchivePreviewModal
        isOpen={!!previewItem}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
};

export default ArchiveListPage;
