import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Music, Upload, Trash2, Play, Pause, Loader2, Volume2, AlertCircle } from 'lucide-react';

export interface BgmAssetDto {
  filename: string;
  originalName: string;
  size: number;
  formattedSize: string;
  streamUrl: string;
  modifiedAt: string;
}

const BgmAssetManager = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playingFilename, setPlayingFilename] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  return (
    <section className="bg-white rounded-2xl shadow-sm border p-6">
      <div className="flex items-center justify-between border-b pb-4 mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Music className="text-blue-600" size={20} />
            배경음악(BGM) 자산 관리
            {bgmList && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {bgmList.length}곡
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            슬라이드 쇼 동영상 제작에 사용될 배경음악 라이브러리를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {uploadMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          <span>음원 업로드</span>
        </button>
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

      {/* 드래그 앤 드롭 업로드 안내 영역 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-5 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <Upload size={20} className={isDragging ? 'text-blue-600' : 'text-gray-400'} />
          <p className="text-xs font-medium text-gray-600">
            음원 파일(MP3, M4A, WAV 등)을 이곳에 끌어다 놓거나 클릭하여 업로드
          </p>
          <p className="text-[11px] text-gray-400">
            서버의 <code className="text-blue-600 font-mono">assets/bgm</code> 폴더에 자동 보관됩니다.
          </p>
        </div>
      </div>

      {/* BGM 목록 */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={28} className="animate-spin mb-2 text-blue-500" />
          <span className="text-sm">BGM 목록을 불러오는 중...</span>
        </div>
      ) : isError ? (
        <div className="py-8 text-center text-red-500 text-sm">
          BGM 목록을 가져오는 데 실패했습니다.
        </div>
      ) : bgmList && bgmList.length > 0 ? (
        <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden">
          {bgmList.map((bgm) => {
            const isPlaying = playingFilename === bgm.filename;
            return (
              <div
                key={bgm.filename}
                className={`flex items-center justify-between p-3.5 transition-colors ${
                  isPlaying ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => togglePlay(bgm)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isPlaying
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 animate-pulse'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-600'
                    }`}
                    title={isPlaying ? '일시정지' : '미리듣기'}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 text-sm truncate">
                        {bgm.filename}
                      </span>
                      {isPlaying && (
                        <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                          <Volume2 size={13} className="animate-bounce" />
                          재생 중
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-3">
                      <span>{bgm.formattedSize}</span>
                      <span>•</span>
                      <span>{formatDate(bgm.modifiedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDelete(bgm.filename)}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="음원 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center border rounded-xl bg-gray-50/50">
          <Music size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm font-medium">등록된 배경음악이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">
            위의 '음원 업로드' 버튼을 눌러 슬라이드 쇼에 사용할 음악을 추가해 보세요.
          </p>
        </div>
      )}
    </section>
  );
};

export default BgmAssetManager;
