import { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  Music,
  Upload,
  Trash2,
  Play,
  Pause,
  Loader2,
  Volume2,
  AlertCircle,
  Search,
  X,
  FolderUp,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export interface BgmAssetDto {
  filename: string;
  originalName: string;
  size: number;
  formattedSize: string;
  streamUrl: string;
  modifiedAt: string;
}

type SortField = 'filename' | 'size' | 'modifiedAt';
type SortDirection = 'asc' | 'desc';

const BgmAssetManager = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 음원 재생 및 상태 관리
  const [playingFilename, setPlayingFilename] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // UI 제어 상태: 드롭존 토글(디폴트: 숨김), 검색, 정렬, 페이징
  const [showDropZone, setShowDropZone] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('modifiedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // BGM 자산 목록 조회
  const { data: bgmList, isLoading, isError } = useQuery<BgmAssetDto[]>({
    queryKey: ['bgm-assets'],
    queryFn: async () => {
      const res = await apiClient.get('/assets/bgm');
      return res.data;
    },
  });

  // BGM 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/assets/bgm/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgm-assets'] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string; error?: string } | string } };
      const msg = typeof error.response?.data === 'string'
        ? error.response.data
        : error.response?.data?.error || error.response?.data?.message || '음원 파일 업로드 중 오류가 발생했습니다.';
      setUploadError(msg);
    },
  });

  // BGM 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      if (playingFilename === filename) {
        stopAudio();
      }
      const res = await apiClient.delete(`/assets/bgm/${encodeURIComponent(filename)}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgm-assets'] });
    },
  });

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingFilename(null);
  };

  const togglePlay = (bgm: BgmAssetDto) => {
    if (playingFilename === bgm.filename) {
      stopAudio();
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setPlayingFilename(null);
        audioRef.current.onerror = () => {
          setPlayingFilename(null);
          alert('오디오를 재생할 수 없습니다.');
        };
      }
      audioRef.current.src = bgm.streamUrl;
      audioRef.current.play().catch((err) => {
        console.error('Audio play error:', err);
        setPlayingFilename(null);
      });
      setPlayingFilename(bgm.filename);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDelete = (filename: string) => {
    if (window.confirm(`'${filename}' 음원을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(filename);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // 정렬 컬럼 토글
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'modifiedAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // 검색 및 정렬된 목록
  const filteredAndSortedList = useMemo(() => {
    if (!bgmList) return [];

    let result = [...bgmList];

    // 실시간 검색 필터
    const trimmed = searchTerm.trim().toLowerCase();
    if (trimmed) {
      result = result.filter((item) => item.filename.toLowerCase().includes(trimmed));
    }

    // 컬럼 정렬
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
  }, [bgmList, searchTerm, sortField, sortDirection]);

  // 페이징 계산
  const totalItems = filteredAndSortedList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // 검색이나 삭제 등으로 페이지 범위를 벗어나면 보정
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedList = useMemo(() => {
    return filteredAndSortedList.slice(startIndex, endIndex);
  }, [filteredAndSortedList, startIndex, endIndex]);

  // 페이징 번호 목록 생성 (최대 5개 표시)
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="text-gray-400 opacity-60 ml-1 inline-block" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="text-blue-600 ml-1 inline-block font-bold" />
    ) : (
      <ArrowDown size={12} className="text-blue-600 ml-1 inline-block font-bold" />
    );
  };

  return (
    <div>
      {/* 상단 타이틀 및 툴바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Music className="text-blue-600" size={20} />
            배경음악(BGM) 자산 관리
            {bgmList && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {bgmList.length}곡
              </span>
            )}
            {searchTerm.trim() && (
              <span className="text-xs text-gray-500 font-medium">
                (검색결과: {filteredAndSortedList.length}곡)
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            슬라이드 쇼 동영상 제작에 사용될 배경음악 라이브러리를 관리합니다.
          </p>
        </div>

        {/* 상단 액션 컨트롤: 검색창 + 드롭존 토글 + 업로드 버튼 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 실시간 파일명 검색 */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="음원 파일명 검색..."
              className="pl-8 pr-7 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-52 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                title="검색어 초기화"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* 드롭존 펼치기/접기 토글 (디폴트: 숨김) */}
          <button
            onClick={() => setShowDropZone((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showDropZone
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
            title="드래그 앤 드롭 업로드 영역 펼치기/접기"
          >
            <FolderUp size={14} />
            <span>드롭존 {showDropZone ? '접기' : '열기'}</span>
            {showDropZone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* 직접 파일 선택 업로드 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {uploadMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            <span>음원 선택</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 에러 메시지 */}
      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm border border-red-100">
          <AlertCircle size={16} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 드래그 앤 드롭 업로드 영역 (토글 기능, 디폴트 숨김) */}
      {showDropZone && (
        <div className="relative mb-5 p-4 border-2 border-dashed rounded-xl bg-blue-50/40 border-blue-300 transition-all animate-in fade-in duration-200">
          <button
            onClick={() => setShowDropZone(false)}
            className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
            title="드롭존 닫기"
          >
            <X size={15} />
          </button>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`py-3 text-center cursor-pointer rounded-lg transition-all ${
              isDragging ? 'bg-blue-100/70 border border-blue-400' : 'hover:bg-white/60'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <Upload size={22} className={isDragging ? 'text-blue-600 animate-bounce' : 'text-blue-500'} />
              <p className="text-xs font-semibold text-gray-700">
                음원 파일(MP3, M4A, WAV, FLAC 등)을 이곳에 끌어다 놓거나 클릭하여 업로드
              </p>
              <p className="text-[11px] text-gray-400">
                최대 100MB까지 업로드 가능하며, 서버의 <code className="text-blue-600 font-mono">assets/bgm</code> 폴더에 자동 보관됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 / 에러 / 데이터 테이블 */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={32} className="animate-spin mb-2 text-blue-500" />
          <span className="text-sm">BGM 목록을 불러오는 중...</span>
        </div>
      ) : isError ? (
        <div className="py-8 text-center text-red-500 text-sm">
          BGM 목록을 가져오는 데 실패했습니다.
        </div>
      ) : !bgmList || bgmList.length === 0 ? (
        <div className="py-12 text-center border rounded-xl bg-gray-50/50">
          <Music size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm font-medium">등록된 배경음악이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">
            위의 '음원 선택' 또는 '드롭존 열기'를 통해 음악을 추가해 보세요.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white">
          {/* 테이블 영역 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 select-none">
                <tr>
                  <th className="py-3 px-3 text-center w-14">재생</th>
                  <th
                    onClick={() => handleSort('filename')}
                    className="py-3 px-4 text-left cursor-pointer hover:text-blue-600 hover:bg-gray-100/50 transition-colors"
                    title="파일명으로 정렬"
                  >
                    <div className="flex items-center gap-1">
                      <span>파일명</span>
                      {renderSortIcon('filename')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('size')}
                    className="py-3 px-4 text-right w-28 cursor-pointer hover:text-blue-600 hover:bg-gray-100/50 transition-colors"
                    title="크기로 정렬"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>크기</span>
                      {renderSortIcon('size')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('modifiedAt')}
                    className="py-3 px-4 text-center w-40 cursor-pointer hover:text-blue-600 hover:bg-gray-100/50 transition-colors"
                    title="등록일시로 정렬"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>등록일시</span>
                      {renderSortIcon('modifiedAt')}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center w-16">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400 text-xs">
                      검색 조건과 일치하는 음원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((bgm) => {
                    const isPlaying = playingFilename === bgm.filename;
                    return (
                      <tr
                        key={bgm.filename}
                        className={`transition-colors border-l-4 ${
                          isPlaying
                            ? 'bg-blue-50/70 border-l-blue-600'
                            : 'hover:bg-gray-50/80 border-l-transparent'
                        }`}
                      >
                        {/* 재생/일시정지 버튼 */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => togglePlay(bgm)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer ${
                              isPlaying
                                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                            }`}
                            title={isPlaying ? '일시정지' : '미리듣기'}
                          >
                            {isPlaying ? (
                              <Pause size={14} />
                            ) : (
                              <Play size={14} className="ml-0.5" />
                            )}
                          </button>
                        </td>

                        {/* 파일명 */}
                        <td className="py-2.5 px-4 font-medium text-gray-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <Music
                              size={15}
                              className={`shrink-0 ${isPlaying ? 'text-blue-600' : 'text-gray-400'}`}
                            />
                            <span
                              className={`truncate text-xs sm:text-sm ${
                                isPlaying ? 'text-blue-950 font-bold' : 'text-gray-800'
                              }`}
                              title={bgm.filename}
                            >
                              {bgm.filename}
                            </span>
                            {isPlaying && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                                <Volume2 size={12} className="animate-pulse" />
                                재생 중
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 파일 크기 */}
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-500 whitespace-nowrap">
                          {bgm.formattedSize}
                        </td>

                        {/* 등록일시 */}
                        <td className="py-2.5 px-4 text-center font-mono text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(bgm.modifiedAt)}
                        </td>

                        {/* 삭제 버튼 */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDelete(bgm.filename)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                            title="음원 삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 하단 페이징 컨트롤 바 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50/75 border-t border-gray-200 text-xs text-gray-600">
            {/* 데이터 범위 안내 */}
            <div>
              총 <span className="font-semibold text-gray-800">{totalItems}</span>개 중{' '}
              <span className="font-medium text-gray-700">
                {totalItems > 0 ? startIndex + 1 : 0} - {endIndex}
              </span>
              번째 표시
            </div>

            <div className="flex items-center gap-3">
              {/* 페이지당 보기 개수 선택 */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">페이지당:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={10}>10개씩</option>
                  <option value={20}>20개씩</option>
                  <option value={50}>50개씩</option>
                </select>
              </div>

              {/* 페이지 번호 네비게이션 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                  title="첫 페이지"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                  title="이전 페이지"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[26px] h-[26px] px-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                      currentPage === page
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                  title="다음 페이지"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                  title="마지막 페이지"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BgmAssetManager;
