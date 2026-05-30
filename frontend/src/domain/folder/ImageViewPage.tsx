import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ChevronLeft, ChevronRight, RotateCw, RotateCcw, Download, Link, Menu, Pencil, Trash2, Bookmark } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PhotoSlider } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { useImageActions } from '@/shared/hooks/useImageActions';
import { useToast } from '@/shared/components/ui/use-toast';
import { useUIStore } from '@/store/uiStore';
import { useUserSettings } from '@/shared/hooks/useUserSettings';

import type { ImageViewFile, ImageFile } from './types';
import ImageInfo from './components/ImageInfo';


const ImageViewPage = () => {
  const { imageId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { copyLink } = useImageActions();
  const { searchQuery } = useUIStore();
  const [isSliderVisible, setIsSliderVisible] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navDirectionRef = useRef<'prev' | 'next' | null>(null);
  const { imageTransition } = useUserSettings();

  const getImgAnimClass = () => {
    const dir = navDirectionRef.current;
    if (!dir || imageTransition === 'none') return '';
    if (imageTransition === 'fade') return 'img-anim-fade';
    if (imageTransition === 'slide') return dir === 'next' ? 'img-anim-slide-next' : 'img-anim-slide-prev';
    if (imageTransition === 'zoom') return 'img-anim-zoom';
    return '';
  };

  // Fetch current image detail
  const { data: image, isLoading: isImageLoading } = useQuery<ImageViewFile>({
    queryKey: ['image-detail', imageId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/${imageId}`);
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  // Fetch all images in the same folder for navigation
  const folderId = image?.folder?.id;
  const { data: folderImages, isLoading: isFolderLoading } = useQuery<ImageFile[]>({
    queryKey: ['folder-images', folderId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/folder/${folderId}`);
      return res.data;
    },
    enabled: !!folderId,
    placeholderData: keepPreviousData,
  });

  const filteredFolderImages = useMemo(() => {
    if (!folderImages) return [];
    if (!searchQuery) return folderImages;
    return folderImages.filter(img => 
      img.orgName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folderImages, searchQuery]);

  const rotateMutation = useMutation({
    mutationFn: async (angle: number) => {
      await apiClient.post('/images/rotate', { ids: [Number(imageId)], angle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-detail', imageId] });
      queryClient.invalidateQueries({ queryKey: ['folder-images', folderId] });
      setImageTimestamp(Date.now());
      toast({ title: '성공', description: '이미지가 회전되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '이미지 회전에 실패했습니다.', variant: 'destructive' });
    }
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ orgName }: { orgName: string }) => {
      await apiClient.patch(`/images/${imageId}`, { orgName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-detail', imageId] });
      toast({ title: '성공', description: '파일명이 변경되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '파일명 변경에 실패했습니다.', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/images', { data: { ids: [Number(imageId)] } });
    },
    onSuccess: () => {
      toast({ title: '성공', description: '이미지가 삭제되었습니다.' });
      navigate(`/folder/${image?.folder.id}`);
    },
    onError: () => {
      toast({ title: '오류', description: '이미지 삭제에 실패했습니다.', variant: 'destructive' });
    }
  });

  const addBookmarkMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiClient.post('/bookmarks', { imageId: Number(imageId), name });
    },
    onSuccess: () => {
      toast({ title: '성공', description: '북마크가 추가되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '북마크 추가에 실패했습니다.', variant: 'destructive' });
    }
  });

  const handleAddBookmark = () => {
    if (!image) return;
    const defaultName = `[${image.folder.folderName}] ${image.orgName}`;
    const name = window.prompt('북마크 이름을 입력하세요:', defaultName);
    if (name !== null && name.trim() !== '') {
      addBookmarkMutation.mutate(name.trim());
    }
  };

  const handleRename = () => {
    if (!image) return;
    const dotIndex = image.orgName.lastIndexOf('.');
    const nameWithoutExt = dotIndex !== -1 ? image.orgName.substring(0, dotIndex) : image.orgName;
    const ext = dotIndex !== -1 ? image.orgName.substring(dotIndex) : '';
    const newName = window.prompt('새 파일명을 입력하세요 (확장자 제외):', nameWithoutExt);
    if (newName !== null && newName.trim() !== '') {
      updateImageMutation.mutate({ orgName: newName.trim() + ext });
    }
  };

  const handleDelete = () => {
    if (window.confirm('이미지를 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  const currentIndex = useMemo(() => {
    if (!filteredFolderImages || !imageId) return 0;
    const index = filteredFolderImages.findIndex(img => img.id === Number(imageId));
    return index === -1 ? 0 : index;
  }, [filteredFolderImages, imageId]);

  const hasPrev = currentIndex > 0;
  const hasNext = filteredFolderImages ? currentIndex < filteredFolderImages.length - 1 : false;

  const sliderImages = useMemo(() => {
    return (filteredFolderImages || []).map(img => ({
      src: `/sofia/api/images/${img.id}/raw?t=${img.id === Number(imageId) ? imageTimestamp : '0'}`,
      key: img.id,
    }));
  }, [filteredFolderImages, imageId, imageTimestamp]);

  const handleIndexChange = useCallback((index: number) => {
    if (filteredFolderImages && filteredFolderImages[index]) {
      navigate(`/image/${filteredFolderImages[index].id}`, { replace: true });
    }
  }, [filteredFolderImages, navigate]);

  const handlePrev = useCallback(() => {
    if (hasPrev && filteredFolderImages) {
      navDirectionRef.current = 'prev';
      handleIndexChange(currentIndex - 1);
    }
  }, [hasPrev, filteredFolderImages, handleIndexChange, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && filteredFolderImages) {
      navDirectionRef.current = 'next';
      handleIndexChange(currentIndex + 1);
    }
  }, [hasNext, filteredFolderImages, handleIndexChange, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (isSliderVisible && e.key === 'Escape') setIsSliderVisible(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSliderVisible, handlePrev, handleNext]);

  // 외부 클릭 시 햄버거 메뉴 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  if (isImageLoading || (folderId && isFolderLoading)) {
    return <div className="p-8 text-center">Loading image...</div>;
  }

  if (!image) return <div className="p-8 text-center">Image not found</div>;

  return (
    <div className="space-y-4">
      {/* ── 상단 툴바 ── */}
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border shadow-sm">
        {/* 좌측: 뒤로가기 + 파일명 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/folder/${image.folder.id}`)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            title="목록으로"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="h-8 w-px bg-gray-200 mx-1" />

          <div>
            <h2 className="text-lg font-bold text-gray-800 truncate max-w-[160px] sm:max-w-[260px] md:max-w-md" title={image.orgName}>
              {image.orgName}
            </h2>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{image.folder.folderName}</p>
          </div>
        </div>

        {/* 우측 */}
        <div className="flex items-center gap-2">

          {/* ── 네비게이터: sm 이상에서만 상단에 표시 ── */}
          <div className="hidden sm:flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
            <Button
              variant="ghost"
              size="icon"
              disabled={!hasPrev}
              onClick={handlePrev}
              className="h-8 w-8 rounded-md hover:bg-white hover:shadow-sm"
              title="이전 이미지 (←)"
            >
              <ChevronLeft size={18} />
            </Button>

            <div className="px-3 min-w-[70px] text-center">
              <span className="text-xs font-bold text-gray-700">{currentIndex + 1}</span>
              <span className="text-[10px] text-gray-400 mx-1">/</span>
              <span className="text-[10px] font-medium text-gray-500">{filteredFolderImages?.length}</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              disabled={!hasNext}
              onClick={handleNext}
              className="h-8 w-8 rounded-md hover:bg-white hover:shadow-sm"
              title="다음 이미지 (→)"
            >
              <ChevronRight size={18} />
            </Button>
          </div>

          {/* ── Desktop: 액션 버튼들 (md 이상) ── */}
          <>
            <div className="hidden md:flex items-center gap-1">
              <div className="h-8 w-px bg-gray-200 mx-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-gray-200"
                onClick={() => rotateMutation.mutate(90)}
                disabled={rotateMutation.isPending}
                title="90도 회전"
              >
                <RotateCw size={16} />
                <span className="hidden lg:inline">90도 회전</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-gray-200"
                onClick={() => rotateMutation.mutate(-90)}
                disabled={rotateMutation.isPending}
                title="90도 반시계방향 회전"
              >
                <RotateCcw size={16} />
                <span className="hidden lg:inline">-90도 회전</span>
              </Button>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Button
                onClick={handleAddBookmark}
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-gray-200"
                disabled={addBookmarkMutation.isPending}
                title="북마크 추가"
              >
                <Bookmark size={16} />
                <span className="hidden lg:inline">북마크 추가</span>
              </Button>

              <Button
                onClick={() => copyLink(image.id)}
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-gray-200"
              >
                <Link size={16} />
                <span className="hidden lg:inline">링크 복사</span>
              </Button>

              <Button
                onClick={handleRename}
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-gray-200"
                disabled={updateImageMutation.isPending}
                title="파일명 변경"
              >
                <Pencil size={16} />
                <span className="hidden lg:inline">이름 바꾸기</span>
              </Button>

              <Button
                onClick={handleDelete}
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={deleteMutation.isPending}
                title="삭제"
              >
                <Trash2 size={16} />
                <span className="hidden lg:inline">삭제</span>
              </Button>

              <Button variant="outline" size="sm" className="h-9 gap-2 border-gray-200" asChild>
                <a href={`/sofia/api/images/${image.id}/raw?t=${imageTimestamp}`} download={image.orgName}>
                  <Download size={16} />
                  <span className="hidden lg:inline">다운로드</span>
                </a>
              </Button>

              <button
                onClick={() => navigate(`/folder/${image.folder.id}`)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                title="목록으로"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
          </>

          {/* ── Tablet/Mobile: 햄버거 드롭다운 (md 미만) ── */}
          <div className="relative md:hidden" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(prev => !prev)}
              className="rounded-lg border bg-gray-50 shadow-sm"
              title="메뉴"
            >
              <Menu size={20} />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-white border rounded-xl shadow-lg py-1">
                {/* 회전 90° */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={rotateMutation.isPending}
                  onClick={() => { rotateMutation.mutate(90); closeMenu(); }}
                >
                  <RotateCw size={16} /> 90° 회전
                </button>

                {/* 회전 -90° */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={rotateMutation.isPending}
                  onClick={() => { rotateMutation.mutate(-90); closeMenu(); }}
                >
                  <RotateCcw size={16} /> 90° 반시계 회전
                </button>

                <div className="h-px bg-gray-100 mx-3 my-1" />

                {/* 북마크 추가 */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={addBookmarkMutation.isPending}
                  onClick={() => { handleAddBookmark(); closeMenu(); }}
                >
                  <Bookmark size={16} /> 북마크 추가
                </button>

                {/* 링크 복사 */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => { copyLink(image.id); closeMenu(); }}
                >
                  <Link size={16} /> 링크 복사
                </button>

                {/* 이름 바꾸기 */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={updateImageMutation.isPending}
                  onClick={() => { handleRename(); closeMenu(); }}
                >
                  <Pencil size={16} /> 이름 바꾸기
                </button>

                {/* 삭제 */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={deleteMutation.isPending}
                  onClick={() => { handleDelete(); closeMenu(); }}
                >
                  <Trash2 size={16} /> 삭제
                </button>

                {/* 다운로드 */}
                <a
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  href={`/sofia/api/images/${image.id}/raw?t=${imageTimestamp}`}
                  download={image.orgName}
                  onClick={closeMenu}
                >
                  <Download size={16} /> 다운로드
                </a>

                <div className="h-px bg-gray-100 mx-3 my-1" />

                {/* 목록 */}
                <button
                  onClick={() => navigate(`/folder/${image.folder.id}`)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                  title="목록으로"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 이미지 + 정보 영역 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-gray-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[500px] sm:min-h-[700px] relative group">

          <div
            key={imageId}
            className={`cursor-zoom-in relative max-w-full max-h-[85vh] ${getImgAnimClass()}`}
            onClick={() => setIsSliderVisible(true)}
          >
            <img
              src={`/sofia/api/images/${imageId}/raw?t=${imageTimestamp}`}
              alt={image.orgName}
              className="max-w-full max-h-[85vh] shadow-2xl"
            />
          </div>

          {/* ── 모바일 전용 이미지 좌우 네비게이션 버튼 (sm 미만) ── */}
          {hasPrev && (
            <button
              className="sm:hidden absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              title="이전 이미지"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {hasNext && (
            <button
              className="sm:hidden absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              title="다음 이미지"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <PhotoSlider
            images={sliderImages[currentIndex] ? [sliderImages[currentIndex]] : []}
            visible={isSliderVisible}
            onClose={() => setIsSliderVisible(false)}
            index={0}
            onIndexChange={() => {}}
            pullClosable={false}
            maskClosable={false}
            toolbarRender={({ onRotate, rotate }) => (
              <div className="flex items-center gap-2 px-4 h-full">
                <button
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white disabled:opacity-30"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  title="이전 이미지 (←)"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-white/70 text-xs min-w-[50px] text-center">
                  {currentIndex + 1} / {filteredFolderImages?.length}
                </span>
                <button
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white disabled:opacity-30"
                  onClick={handleNext}
                  disabled={!hasNext}
                  title="다음 이미지 (→)"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="w-px h-5 bg-white/20 mx-1" />
                <button
                  className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                  onClick={() => onRotate(rotate + 90)}
                  title="90도 회전"
                >
                  <RotateCw size={20} />
                </button>
                <button
                  className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                  onClick={handleAddBookmark}
                  title="북마크 추가"
                >
                  <Bookmark size={20} />
                </button>
                <button
                  className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                  onClick={() => copyLink(image.id)}
                  title="링크 복사"
                >
                  <Link size={20} />
                </button>
                <a
                  className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                  href={`/sofia/api/images/${image.id}/raw?t=${imageTimestamp}`}
                  download={image.orgName}
                  title="다운로드"
                >
                  <Download size={20} />
                </a>
              </div>
            )}
          />



          {filteredFolderImages && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-medium flex gap-3">
              <span>{currentIndex + 1} / {filteredFolderImages.length}</span>
              <span className="text-white/30">|</span>
              <span>{image.imageWidth} x {image.imageHeight}</span>
            </div>
          )}
        </div>

        <ImageInfo image={image} />
      </div>
    </div>
  );
};

export default ImageViewPage;
