import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { LayoutGrid, List as ListIcon, ChevronLeft } from 'lucide-react';

import { useUIStore } from '@/store/uiStore';
import { formatDateTime, formatFileSize } from '@/lib/utils';

interface ImageFile {
  id: number;
  orgName: string;
  imageFormat: string;
  imageWidth: number;
  imageHeight: number;
  captureDateTime: string;
  fileSize: number;
  note?: string;
}

const ImageListPage = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { imageListViewMode: viewMode, setImageListViewMode: setViewMode } = useUIStore();

  const { data: images, isLoading } = useQuery<ImageFile[]>({
    queryKey: ['folder-images', folderId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/folder/${folderId}`);
      return res.data;
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading images...</div>;



  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">이미지 목록</h2>
        </div>

        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('thumb')}
            className={`p-2 rounded-md transition-all ${viewMode === 'thumb' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <ListIcon size={20} />
          </button>
        </div>
      </div>

      {viewMode === 'thumb' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images?.map((img) => (
            <div
              key={img.id}
              className="group relative bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(`/image/${img.id}`)}
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={`/sofia/api/images/${img.id}/thumb`}
                  alt={img.orgName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-600 truncate font-medium">{img.orgName}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-blue-100 text-gray-600 text-sm font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">미리보기</th>
                <th className="px-4 py-3">파일명</th>
                <th className="px-4 py-3">포맷</th>
                <th className="px-4 py-3">해상도</th>
                <th className="px-4 py-3 text-right">파일용량</th>
                <th className="px-4 py-3">촬영일시</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {images?.map((img) => (
                <tr
                  key={img.id}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/image/${img.id}`)}
                >
                  <td className="px-4 py-3 text-sm text-gray-600">{img.id}</td>
                  <td className="px-4 py-3">
                    <img
                      src={`/sofia/api/images/${img.id}/thumb`}
                      className="w-12 h-12 object-cover rounded shadow-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{img.orgName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 uppercase">{img.imageFormat}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{img.imageWidth} x {img.imageHeight}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatFileSize(img.fileSize)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDateTime(img.captureDateTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ImageListPage;
