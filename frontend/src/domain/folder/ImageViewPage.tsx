import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ChevronLeft, ChevronRight, RotateCw, RotateCcw, Download, List, Link } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PhotoSlider } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { useImageActions } from '@/shared/hooks/useImageActions';
import { useToast } from '@/shared/components/ui/use-toast';

import type { ImageViewFile, ImageFile } from './types';
import ImageInfo from './components/ImageInfo';


const ImageViewPage = () => {
  const { imageId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { copyLink } = useImageActions();
  const [isSliderVisible, setIsSliderVisible] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());

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

  const currentIndex = useMemo(() => {
    if (!folderImages || !imageId) return 0;
    const index = folderImages.findIndex(img => img.id === Number(imageId));
    return index === -1 ? 0 : index;
  }, [folderImages, imageId]);

  const hasPrev = currentIndex > 0;
  const hasNext = folderImages ? currentIndex < folderImages.length - 1 : false;

  const sliderImages = useMemo(() => {
    return (folderImages || []).map(img => ({
      src: `/sofia/api/images/${img.id}/raw?t=${img.id === Number(imageId) ? imageTimestamp : '0'}`,
      key: img.id,
    }));
  }, [folderImages, imageId, imageTimestamp]);

  const handleIndexChange = (index: number) => {
    if (folderImages && folderImages[index]) {
      navigate(`/image/${folderImages[index].id}`, { replace: true });
    }
  };

  const handlePrev = () => {
    if (hasPrev && folderImages) {
      handleIndexChange(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (hasNext && folderImages) {
      handleIndexChange(currentIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSliderVisible) return;
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, folderImages, currentIndex, isSliderVisible]);


  if (isImageLoading || (folderId && isFolderLoading)) {
    return <div className="p-8 text-center">Loading image...</div>;
  }

  if (!image) return <div className="p-8 text-center">Image not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border shadow-sm">
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
            <h2 className="text-lg font-bold text-gray-800 truncate max-w-[200px] md:max-w-md" title={image.orgName}>
              {image.orgName}
            </h2>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{image.folder.folderName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 회전 버튼 그룹 */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-gray-600"
              onClick={() => rotateMutation.mutate(90)}
              disabled={rotateMutation.isPending}
              title="90도 회전"
            >
              <RotateCw size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-gray-600"
              onClick={() => rotateMutation.mutate(180)}
              disabled={rotateMutation.isPending}
              title="180도 회전"
            >
              <RotateCcw size={16} />
            </Button>
          </div>

          {/* 네비게이터 그룹 */}
          <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
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
              <span className="text-xs font-bold text-gray-700">
                {currentIndex + 1}
              </span>
              <span className="text-[10px] text-gray-400 mx-1">/</span>
              <span className="text-[10px] font-medium text-gray-500">
                {folderImages?.length}
              </span>
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

          <div className="h-8 w-px bg-gray-200 mx-1" />

          {/* 액션 버튼 그룹 */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => copyLink(image.id)}
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-gray-200"
            >
              <Link size={16} />
              <span className="hidden sm:inline">링크 복사</span>
            </Button>
            
            <a
              href={`/sofia/api/images/${image.id}/raw?t=${imageTimestamp}`}
              download={image.orgName}
              className="flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-xs font-bold shadow-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">다운로드</span>
            </a>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/folder/${image.folder.id}`)}
              className="h-9 gap-2 text-gray-600 hover:bg-gray-100"
            >
              <List size={16} />
              <span className="hidden lg:inline">목록</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-gray-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[700px] relative group">

          <div
            className="cursor-zoom-in relative max-w-full max-h-[85vh]"
            onClick={() => setIsSliderVisible(true)}
          >
            <img
              src={`/sofia/api/images/${image.id}/raw?t=${imageTimestamp}`}
              alt={image.orgName}
              className="max-w-full max-h-[85vh] shadow-2xl transition-all duration-300"
            />
          </div>

          <PhotoSlider
            images={sliderImages}
            visible={isSliderVisible}
            onClose={() => setIsSliderVisible(false)}
            index={currentIndex}
            onIndexChange={handleIndexChange}
            toolbarRender={({ onRotate, rotate }) => (
              <div className="flex items-center gap-4 px-4 h-full">
                <button
                  className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                  onClick={() => onRotate(rotate + 90)}
                  title="90도 회전"
                >
                  <RotateCw size={20} />
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

          {folderImages && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-medium flex gap-3">
              <span>{currentIndex + 1} / {folderImages.length}</span>
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
