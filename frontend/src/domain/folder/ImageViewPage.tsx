import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ChevronLeft, RotateCw, Download, List, Link, Maximize2 } from 'lucide-react';
import { useToast } from '@/shared/components/ui/use-toast';
import { Button } from '@/shared/components/ui/button';
import { PhotoSlider } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

import type { ImageViewFile, ImageFile } from './types';
import ImageInfo from './components/ImageInfo';


const ImageViewPage = () => {
  const { imageId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSliderVisible, setIsSliderVisible] = useState(false);

  // Fetch current image detail
  const { data: image, isLoading: isImageLoading } = useQuery<ImageViewFile>({
    queryKey: ['image-detail', imageId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/${imageId}`);
      return res.data;
    },
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
  });

  const currentIndex = useMemo(() => {
    if (!folderImages || !imageId) return 0;
    const index = folderImages.findIndex(img => img.id === Number(imageId));
    return index === -1 ? 0 : index;
  }, [folderImages, imageId]);

  const sliderImages = useMemo(() => {
    return (folderImages || []).map(img => ({
      src: `/sofia/api/images/${img.id}/raw`,
      key: img.id,
    }));
  }, [folderImages]);

  const handleIndexChange = (index: number) => {
    if (folderImages && folderImages[index]) {
      navigate(`/image/${folderImages[index].id}`, { replace: true });
    }
  };

  const handleCopyLink = (id: number) => {
    const url = `${window.location.origin}/sofia/api/images/${id}/raw`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: '성공', description: '이미지 링크가 복사되었습니다.' });
    }).catch(() => {
      toast({ title: '오류', description: '링크 복사에 실패했습니다.', variant: 'destructive' });
    });
  };

  if (isImageLoading || (folderId && isFolderLoading)) {
    return <div className="p-8 text-center">Loading image...</div>;
  }
  
  if (!image) return <div className="p-8 text-center">Image not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/folder/${image.folder.id}`)}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{image.orgName}</h2>
            <p className="text-xs text-gray-500">{image.folder.folderName}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleCopyLink(image.id)}
            variant="outline"
            className="flex items-center gap-2 h-10"
          >
            <Link size={18} />
            링크 복사
          </Button>
          <a
            href={`/sofia/api/images/${image.id}/raw`}
            download={image.orgName}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Download size={18} />
            Download
          </a>
          <button
            onClick={() => navigate(`/folder/${image.folder.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            <List size={18} />
            리스트로 돌아가기
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-gray-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[700px] relative group">
          
          <div 
            className="cursor-zoom-in relative max-w-full max-h-[85vh]"
            onClick={() => setIsSliderVisible(true)}
          >
            <img
              src={`/sofia/api/images/${image.id}/raw`}
              alt={image.orgName}
              className="max-w-full max-h-[85vh] shadow-2xl transition-all duration-300"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 pointer-events-none">
              <Maximize2 size={48} className="text-white drop-shadow-lg" />
            </div>
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
                  onClick={() => handleCopyLink(image.id)}
                  title="링크 복사"
                >
                  <Link size={20} />
                </button>
                <a
                  className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                  href={`/sofia/api/images/${image.id}/raw`}
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
