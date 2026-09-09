import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  Image,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  X,
  FolderUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export interface DecorationAssetDto {
  filename: string;
  originalName: string;
  size: number;
  formattedSize: string;
  imageUrl: string;
  modifiedAt: string;
}

type SortField = 'filename' | 'size' | 'modifiedAt';
type SortDirection = 'asc' | 'desc';

const DecorationAssetManager = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showDropZone, setShowDropZone] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('modifiedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: decoList, isLoading, isError } = useQuery<DecorationAssetDto[]>({
    queryKey: ['decoration-assets'],
    queryFn: async () => {
      const res = await apiClient.get('/assets/decorations');
      return res.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/assets/decorations/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decoration-assets'] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string; error?: string } | string } };
      const msg = typeof error.response?.data === 'string'
        ? error.response.data
        : error.response?.data?.error || error.response?.data?.message || '이미지 파일 업로드 중 오류가 발생했습니다.';
      setUploadError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await apiClient.delete(`/assets/decorations/${encodeURIComponent(filename)}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decoration-assets'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDelete = (filename: string) => {
    if (window.confirm(`'${filename}' 이미지를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(filename);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return isoStr; }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'modifiedAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const filteredAndSortedList = useMemo(() => {
    if (!decoList) return [];
    let result = [...decoList];
    const trimmed = searchTerm.trim().toLowerCase();
    if (trimmed) {
      result = result.filter((item) => item.filename.toLowerCase().includes(trimmed));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'filename') {
        cmp = a.filename.localeCompare(b.filename, 'ko-KR', { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'size') {
        cmp = a.size - b.size;
      } else if (sortField === 'modifiedAt') {
        cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [decoList, searchTerm, sortField, sortDirection]);

  const totalItems = filteredAndSortedList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedList = useMemo(() => filteredAndSortedList.slice(startIndex, endIndex), [filteredAndSortedList, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > totalPages) { end = totalPages; start = Math.max(1, end - maxButtons + 1); }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-gray-400 opacity-60 ml-1 inline-block" />;
    return sortDirection === 'asc'
      ? <ArrowUp size={12} className="text-blue-600 ml-1 inline-block font-bold" />
      : <ArrowDown size={12} className="text-blue-600 ml-1 inline-block font-bold" />;
  };

  return (
    <div>
      {/* 상단 타이틀 및 툴바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Image className="text-indigo-600" size={20} />
            장식 이미지 자산 관리
            {decoList && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                {decoList.length}개
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            슬라이드쇼 타이틀 카드에 합성될 장식 이미지 (PNG, JPG, WEBP)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDropZone((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <FolderUp size={14} />
            {showDropZone ? '업로드 닫기' : '이미지 업로드'}
          </button>
        </div>
      </div>

      {/* 업로드 드롭존 */}
      {showDropZone && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mb-4 border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={28} className={`mx-auto mb-2 ${isDragging ? 'text-indigo-500' : 'text-gray-300'}`} />
          <p className="text-sm text-gray-500">
            드래그 앤 드롭 또는 <span className="text-indigo-600 font-medium">클릭하여 이미지 선택</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP 지원 · 최대 100MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {uploadMutation.isPending && (
        <div className="mb-4 flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5">
          <Loader2 size={16} className="animate-spin" />
          이미지 업로드 중...
        </div>
      )}

      {uploadError && (
        <div className="mb-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto">
            <X size={14} className="text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* 검색 및 페이지 크기 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="파일명 검색..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={12} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
          <span>페이지당</span>
          {[10, 20, 50].map((n) => (
            <button
              key={n}
              onClick={() => { setPageSize(n); setCurrentPage(1); }}
              className={`px-2 py-1 rounded transition-colors ${pageSize === n ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-24 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" /> 불러오는 중...
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">
          <AlertCircle size={16} /> 장식 이미지 목록을 불러오지 못했습니다.
        </div>
      ) : filteredAndSortedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-28 text-gray-400 text-sm gap-2">
          <Image size={28} className="text-gray-200" />
          {searchTerm ? '검색 결과가 없습니다.' : '등록된 장식 이미지가 없습니다.'}
        </div>
      ) : (
        <>
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[2fr_auto_1fr_auto] gap-x-3 px-3 py-1.5 text-xs font-semibold text-gray-400 border-b">
            <button className="text-left hover:text-gray-600 flex items-center" onClick={() => handleSort('filename')}>
              파일명 {renderSortIcon('filename')}
            </button>
            <span className="text-center w-16">미리보기</span>
            <button className="text-left hover:text-gray-600 flex items-center" onClick={() => handleSort('size')}>
              크기 {renderSortIcon('size')}
            </button>
            <span className="text-right">삭제</span>
          </div>

          {/* 목록 행 */}
          <div className="divide-y">
            {paginatedList.map((item) => (
              <div key={item.filename} className="grid grid-cols-[2fr_auto_1fr_auto] gap-x-3 items-center px-3 py-2.5 hover:bg-gray-50/70 transition-colors group">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.filename}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.modifiedAt)}</p>
                </div>
                <div className="w-16 flex justify-center">
                  <img
                    src={item.imageUrl}
                    alt={item.filename}
                    className="w-12 h-12 object-cover rounded-lg border border-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="text-xs text-gray-500">{item.formattedSize}</div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDelete(item.filename)}
                    disabled={deleteMutation.isPending}
                    title="삭제"
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 페이징 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <p className="text-xs text-gray-400">
                {startIndex + 1}–{endIndex} / {totalItems}개
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronsLeft size={14} />
                </button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCurrentPage(n)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${currentPage === n ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                  >
                    {n}
                  </button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DecorationAssetManager;
