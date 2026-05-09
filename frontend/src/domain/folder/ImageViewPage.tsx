import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ChevronLeft, ZoomIn, ZoomOut, RotateCw, Maximize, Download, List, Link } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/shared/components/ui/use-toast';
import { Button } from '@/shared/components/ui/button';

interface ImageFile {
  id: number;
  orgName: string;
  imageFormat: string;
  imageWidth: number;
  imageHeight: number;
  folder: {
    id: number;
    folderName: string;
  };
  cameraManufacturer?: string;
  cameraModel?: string;
  captureDateTime?: string;
  shutterSpeed?: number;
  apertureValue?: number;
  isoSpeed?: number;
  focalLength?: number;
}

const ImageViewPage = () => {
  const { imageId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const { data: image, isLoading } = useQuery<ImageFile>({
    queryKey: ['image-detail', imageId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/${imageId}`);
      return res.data;
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading image...</div>;
  if (!image) return <div className="p-8 text-center">Image not found</div>;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/sofia/api/images/${image.id}/raw`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: '성공', description: '이미지 링크가 복사되었습니다.' });
    }).catch(() => {
      toast({ title: '오류', description: '링크 복사에 실패했습니다.', variant: 'destructive' });
    });
  };

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
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setZoom(prev => Math.max(0.1, prev - 0.2))} className="p-2 hover:bg-white rounded shadow-sm text-gray-600"><ZoomOut size={18} /></button>
            <button onClick={() => setZoom(prev => Math.min(5, prev + 0.2))} className="p-2 hover:bg-white rounded shadow-sm text-gray-600"><ZoomIn size={18} /></button>
            <button onClick={() => setRotation(prev => (prev + 90) % 360)} className="p-2 hover:bg-white rounded shadow-sm text-gray-600"><RotateCw size={18} /></button>
            <button onClick={() => { setZoom(1); setRotation(0); }} className="p-2 hover:bg-white rounded shadow-sm text-gray-600"><Maximize size={18} /></button>
          </div>
          <Button
            onClick={handleCopyLink}
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <List size={18} />
            리스트로 돌아가기
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[600px] relative">
          <div
            className="transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={`/sofia/api/images/${image.id}/raw`}
              alt={image.orgName}
              className="max-w-full max-h-[80vh] shadow-2xl"
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs">
            {Math.round(zoom * 100)}% | {rotation}°
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">파일 정보</h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-gray-500">포맷</span>
              <span className="text-gray-800 font-medium uppercase">{image.imageFormat}</span>
              <span className="text-gray-500">해상도</span>
              <span className="text-gray-800 font-medium">{image.imageWidth} x {image.imageHeight}</span>
              <span className="text-gray-500">촬영일시</span>
              <span className="text-gray-800 font-medium">{formatDateTime(image.captureDateTime)}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">EXIF 데이터</h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">카메라</p>
                <p className="text-sm text-gray-800 font-semibold">{image.cameraManufacturer} {image.cameraModel || '정보 없음'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">셔터 스피드</p>
                  <p className="text-sm text-gray-800 font-semibold">{image.shutterSpeed ? `1/${Math.round(1 / image.shutterSpeed)}` : '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">조리개</p>
                  <p className="text-sm text-gray-800 font-semibold">{image.apertureValue ? `f/${image.apertureValue.toFixed(1)}` : '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">ISO</p>
                  <p className="text-sm text-gray-800 font-semibold">{image.isoSpeed || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">초점 거리</p>
                  <p className="text-sm text-gray-800 font-semibold">{image.focalLength ? `${image.focalLength}mm` : '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewPage;
