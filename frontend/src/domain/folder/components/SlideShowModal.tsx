import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  X,
  Film,
  Play,
  Pause,
  Download,
  FolderDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Square,
  Music,
} from 'lucide-react';
import type { ImageFile } from '../types';
import type { BgmAssetDto } from '@/domain/user/components/BgmAssetManager';
import { Button } from '@/shared/components/ui/button';

interface SlideShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImages: ImageFile[];
  folderId?: number;
  folderName?: string;
}

interface SlideShowTaskStatus {
  taskId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  message: string;
  streamUrl?: string;
  downloadUrl?: string;
  filePath?: string;
  error?: string;
}

const TRANSITIONS = [
  { id: 'fade', name: '크로스 디졸브', desc: '부드럽고 자연스럽게 겹치며 전환' },
  { id: 'circlecrop', name: '서클 아이리스', desc: '원형으로 열리고 닫히는 감성 효과' },
  { id: 'slideleft', name: '슬라이드 좌측', desc: '왼쪽으로 밀어내며 다음 사진 등장' },
  { id: 'pixelize', name: '픽셀 모자이크', desc: '디지털 픽셀로 전환' },
  { id: 'hblur', name: '블러 디졸브', desc: '흐릿한 블러 잔상으로 전환' },
];

const DURATIONS = [
  { value: 2.0, label: '2초 (빠르게)' },
  { value: 3.0, label: '3초 (기본)' },
  { value: 4.0, label: '4초 (여유롭게)' },
  { value: 5.0, label: '5초 (천천히)' },
];

const RATIOS = [
  { value: '16:9', label: '16:9 와이드', desc: 'PC / TV / 유튜브', icon: Monitor },
  { value: '9:16', label: '9:16 세로', desc: '스마트폰 / 릴스 / 쇼츠', icon: Smartphone },
  { value: '1:1', label: '1:1 정사각', desc: '인스타그램 피드', icon: Square },
];

export const SlideShowModal = ({
  isOpen,
  onClose,
  selectedImages,
  folderId,
}: SlideShowModalProps) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [durationPerImage, setDurationPerImage] = useState<number>(3.0);
  const [transition, setTransition] = useState<string>('fade');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [selectedBgm, setSelectedBgm] = useState<string>('');

  // 오디오 미리듣기
  const [previewBgm, setPreviewBgm] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // 비디오 생성 작업 상태
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<SlideShowTaskStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSavingToFolder, setIsSavingToFolder] = useState<boolean>(false);
  const [savedFolderSuccess, setSavedFolderSuccess] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopBgm = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setPreviewBgm(null);
  }, []);

  // BGM 자산 목록 조회
  const { data: bgmAssets } = useQuery<BgmAssetDto[]>({
    queryKey: ['bgm-assets'],
    queryFn: async () => {
      const res = await apiClient.get('/assets/bgm');
      return res.data;
    },
    enabled: isOpen,
  });

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setImages([...selectedImages]);
      setTaskId(null);
      setTaskStatus(null);
      setIsGenerating(false);
      setSavedFolderSuccess(null);
      setGenerationError(null);
      stopBgm();
      // BGM 기본값 설정 (첫 번째 곡 또는 빈 값)
      if (bgmAssets && bgmAssets.length > 0) {
        setSelectedBgm((prev) => (prev ? prev : bgmAssets[0].filename));
      }
    } else {
      stopBgm();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }
  }, [isOpen, selectedImages, bgmAssets, stopBgm]);

  const toggleBgmPreview = (filename: string, streamUrl: string) => {
    if (previewBgm === filename) {
      stopBgm();
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
        previewAudioRef.current.onended = () => setPreviewBgm(null);
      }
      previewAudioRef.current.src = streamUrl;
      previewAudioRef.current.play().catch(() => setPreviewBgm(null));
      setPreviewBgm(filename);
    }
  };

  // 사진 순서 변경
  const moveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const next = [...images];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setImages(next);
  };

  // 사진 제외
  const removeImage = (id: number) => {
    if (images.length <= 2) {
      alert('슬라이드 쇼를 만들려면 최소 2장 이상의 사진이 필요합니다.');
      return;
    }
    setImages(images.filter((img) => img.id !== id));
  };

  // 동영상 생성 시작
  const handleStartGeneration = async () => {
    if (images.length < 2) {
      alert('최소 2장 이상의 사진을 선택해 주세요.');
      return;
    }

    stopBgm();
    setIsGenerating(true);
    setGenerationError(null);
    setSavedFolderSuccess(null);

    try {
      const payload = {
        imageIds: images.map((img) => img.id),
        folderId,
        durationPerImage,
        transition,
        aspectRatio,
        bgmFilename: selectedBgm || null,
      };

      const res = await apiClient.post('/slideshow/generate', payload);
      const newTaskId = res.data.taskId;
      setTaskId(newTaskId);

      // 진행률 폴링 시작
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await apiClient.get<SlideShowTaskStatus>(
            `/slideshow/progress/${newTaskId}`
          );
          const status = statusRes.data;
          setTaskStatus(status);

          if (status.status === 'COMPLETED') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGenerating(false);
          } else if (status.status === 'FAILED') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGenerating(false);
            setGenerationError(status.message || '동영상 생성에 실패했습니다.');
          }
        } catch (err) {
          console.error('Polling progress error:', err);
        }
      }, 800);
    } catch (err: unknown) {
      console.error('Failed to start slideshow generation:', err);
      setIsGenerating(false);
      setGenerationError('슬라이드 쇼 생성 요청 중 오류가 발생했습니다.');
    }
  };

  // 현재 폴더에 저장
  const handleSaveToFolder = async () => {
    if (!taskId) return;
    setIsSavingToFolder(true);
    setSavedFolderSuccess(null);
    try {
      const res = await apiClient.post(`/slideshow/save/${taskId}`, { folderId });
      setSavedFolderSuccess(res.data.filename || '저장 완료');
    } catch (err) {
      console.error('Save to folder error:', err);
      alert('폴더에 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsSavingToFolder(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* 백드롭 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={isGenerating ? undefined : onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <Film size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                슬라이드 쇼 (Slide Show) 만들기
              </h2>
              <p className="text-xs text-gray-500">
                사진들을 모아 감성 BGM과 전환 효과가 어우러진 하나의 MP4 영상으로 제작합니다.
              </p>
            </div>
          </div>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* 바디 컨텐츠 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 상태 1: 렌더링 진행 중 */}
          {isGenerating && (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse">
                  <Film size={36} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold animate-bounce shadow">
                  <Sparkles size={14} />
                </div>
              </div>

              <div className="space-y-2 max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-800">
                  {taskStatus?.message || '동영상 인코딩 준비 중...'}
                </h3>
                <p className="text-xs text-gray-500">
                  선택한 {images.length}장의 사진을 고화질 1080p MP4로 인코딩하고 있습니다.
                  서버 GPU 하드웨어 가속이 적용됩니다.
                </p>

                {/* 프로그레스 바 */}
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden border mt-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${taskStatus?.progress || 10}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold text-gray-500 px-1 pt-1">
                  <span>진행률</span>
                  <span className="text-blue-600">{taskStatus?.progress || 10}%</span>
                </div>
              </div>
            </div>
          )}

          {/* 상태 2: 완성 화면 */}
          {!isGenerating && taskStatus?.status === 'COMPLETED' && (
            <div className="space-y-5">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
                <CheckCircle2 size={22} className="text-green-600 shrink-0" />
                <div className="flex-1 text-sm font-medium">
                  {taskStatus.message || '슬라이드 쇼 동영상이 성공적으로 완성되었습니다!'}
                </div>
              </div>

              {/* 비디오 플레이어 */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[420px] flex items-center justify-center shadow-lg">
                <video
                  src={taskStatus.streamUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              {/* 완료 후 액션 버튼 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTaskStatus(null);
                    setTaskId(null);
                  }}
                  className="gap-2"
                >
                  <RotateCcw size={16} />
                  <span>다시 설정하기</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveToFolder}
                    disabled={isSavingToFolder || !!savedFolderSuccess}
                    className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                  >
                    <FolderDown size={16} />
                    <span>
                      {savedFolderSuccess
                        ? `폴더 저장 완료 (${savedFolderSuccess})`
                        : isSavingToFolder
                        ? '저장 중...'
                        : '현재 폴더에 저장'}
                    </span>
                  </Button>

                  <a
                    href={taskStatus.downloadUrl}
                    download
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <Download size={16} />
                    <span>MP4 다운로드</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 상태 3: 설정 및 준비 폼 */}
          {!isGenerating && taskStatus?.status !== 'COMPLETED' && (
            <>
              {/* 에러 안내 */}
              {generationError && (
                <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2.5 text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              {/* 1. 사진 필름스트립 (순서 변경 및 제외) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <span>선택된 사진 목록 ({images.length}장)</span>
                  </label>
                  <span className="text-xs text-gray-400">
                    좌우 화살표로 순서를 변경하거나 X 버튼으로 제외할 수 있습니다.
                  </span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 group shadow-sm hover:border-blue-400 transition-all"
                    >
                      <img
                        src={`/sofia/api/images/${img.id}/thumbnail`}
                        alt={img.orgName}
                        className="w-full h-full object-cover"
                      />
                      {/* 순서 뱃지 */}
                      <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        {idx + 1}
                      </span>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="제외"
                      >
                        <X size={12} />
                      </button>

                      {/* 좌우 순서 변경 버튼 */}
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-between px-1 py-0.5 transition-opacity text-white">
                        <button
                          onClick={() => moveImage(idx, 'left')}
                          disabled={idx === 0}
                          className="disabled:opacity-20 hover:text-blue-300"
                          title="앞으로 이동"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => moveImage(idx, 'right')}
                          disabled={idx === images.length - 1}
                          className="disabled:opacity-20 hover:text-blue-300"
                          title="뒤로 이동"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. 연출 옵션 설정 (그리드 2열) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* 좌측: 화면 전환 및 재생 시간 */}
                <div className="space-y-4 bg-gray-50/70 p-4 rounded-xl border">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Clock size={15} className="text-blue-600" />
                      사진 1장당 재생 시간
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DURATIONS.map((dur) => (
                        <button
                          key={dur.value}
                          onClick={() => setDurationPerImage(dur.value)}
                          className={`px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                            durationPerImage === dur.value
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {dur.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Sparkles size={15} className="text-indigo-600" />
                      화면 전환 효과
                    </label>
                    <div className="space-y-1.5">
                      {TRANSITIONS.map((trans) => (
                        <div
                          key={trans.id}
                          onClick={() => setTransition(trans.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                            transition === trans.id
                              ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-xs'
                              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold">{trans.name}</div>
                            <div className="text-[11px] text-gray-400">{trans.desc}</div>
                          </div>
                          <input
                            type="radio"
                            name="transition"
                            checked={transition === trans.id}
                            onChange={() => setTransition(trans.id)}
                            className="text-indigo-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 우측: 화면 비율 및 배경음악 */}
                <div className="space-y-4 bg-gray-50/70 p-4 rounded-xl border">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Monitor size={15} className="text-purple-600" />
                      화면 비율 (종횡비)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {RATIOS.map((r) => {
                        const Icon = r.icon;
                        return (
                          <button
                            key={r.value}
                            onClick={() => setAspectRatio(r.value)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all ${
                              aspectRatio === r.value
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Icon size={18} className="mb-1" />
                            <span className="text-xs font-bold">{r.label}</span>
                            <span
                              className={`text-[10px] mt-0.5 ${
                                aspectRatio === r.value ? 'text-purple-100' : 'text-gray-400'
                              }`}
                            >
                              {r.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <Music size={15} className="text-blue-600" />
                        배경음악 (BGM)
                      </label>
                      <span className="text-[11px] text-blue-600 hover:underline">
                        설정 메뉴에서 음원 추가 가능
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-1.5 bg-white">
                      {/* 음악 없음 옵션 */}
                      <div
                        onClick={() => {
                          setSelectedBgm('');
                          stopBgm();
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          selectedBgm === ''
                            ? 'bg-blue-50 border border-blue-400 text-blue-900 font-semibold'
                            : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span className="text-xs">음악 없음 (No BGM)</span>
                        <input
                          type="radio"
                          name="bgm"
                          checked={selectedBgm === ''}
                          onChange={() => setSelectedBgm('')}
                        />
                      </div>

                      {/* BGM 자산 목록 */}
                      {bgmAssets && bgmAssets.length > 0 ? (
                        bgmAssets.map((bgm) => {
                          const isSelected = selectedBgm === bgm.filename;
                          const isPreviewing = previewBgm === bgm.filename;
                          return (
                            <div
                              key={bgm.filename}
                              onClick={() => setSelectedBgm(bgm.filename)}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-50 border border-blue-400 text-blue-900 font-semibold'
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBgmPreview(bgm.filename, bgm.streamUrl);
                                  }}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                    isPreviewing
                                      ? 'bg-blue-600 text-white animate-pulse'
                                      : 'bg-gray-100 hover:bg-blue-100 text-gray-600'
                                  }`}
                                  title={isPreviewing ? '정지' : '미리듣기'}
                                >
                                  {isPreviewing ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                                </button>
                                <span className="text-xs truncate">{bgm.filename}</span>
                                {isPreviewing && (
                                  <Volume2 size={12} className="text-blue-600 shrink-0 animate-bounce" />
                                )}
                              </div>
                              <input
                                type="radio"
                                name="bgm"
                                checked={isSelected}
                                onChange={() => setSelectedBgm(bgm.filename)}
                                className="ml-2"
                              />
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-xs text-gray-400">
                          등록된 BGM 음원이 없습니다. (상단 [설정] 메뉴에서 음원을 등록해 보세요)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 하단 푸터 버튼 */}
        {!isGenerating && taskStatus?.status !== 'COMPLETED' && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              예상 영상 길이: 약{' '}
              <span className="font-bold text-gray-700">
                {Math.round((images.length * durationPerImage - (images.length - 1) * 0.8) * 10) / 10}초
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button
                onClick={handleStartGeneration}
                disabled={images.length < 2}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 shadow-md shadow-blue-200"
              >
                <Film size={16} />
                <span>슬라이드 쇼 만들기</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
