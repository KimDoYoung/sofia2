import { formatDateTime } from '@/lib/utils';
import type { ImageViewFile } from '../types';

interface ImageInfoProps {
  image: ImageViewFile;
}

// 이미지의 파일 정보와 EXIF 데이터를 표시하는 사이드 패널 컴포넌트
const ImageInfo = ({ image }: ImageInfoProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      {/* 파일 기본 정보 */}
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

      {/* EXIF 데이터 */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">EXIF 데이터</h3>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">카메라</p>
            <p className="text-sm text-gray-800 font-semibold">
              {image.cameraManufacturer} {image.cameraModel || '정보 없음'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">셔터 스피드</p>
              <p className="text-sm text-gray-800 font-semibold">
                {image.shutterSpeed ? `1/${Math.round(1 / image.shutterSpeed)}` : '-'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">조리개</p>
              <p className="text-sm text-gray-800 font-semibold">
                {image.apertureValue ? `f/${image.apertureValue.toFixed(1)}` : '-'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">ISO</p>
              <p className="text-sm text-gray-800 font-semibold">{image.isoSpeed || '-'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">초점 거리</p>
              <p className="text-sm text-gray-800 font-semibold">
                {image.focalLength ? `${image.focalLength}mm` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageInfo;
