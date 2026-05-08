import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { LayoutGrid, List as ListIcon, ChevronLeft } from 'lucide-react';
import { useState } from 'react';

import { useUIStore } from '@/store/uiStore';
import { formatDateTime, formatFileSize } from '@/lib/utils';
import { ImageThumbCard1 } from '@/shared/components/ImageThumbCard1';
import { Button } from '@/shared/components/ui/button';

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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: images, isLoading } = useQuery<ImageFile[]>({
    queryKey: ['folder-images', folderId],
    queryFn: async () => {
      const res = await apiClient.get(`/images/folder/${folderId}`);
      return res.data;
    },
  });

  const handleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRename = (id: number) => {
    console.log('Rename', id);
    // TODO: Implement rename logic
  };

  const handleAddNote = (id: number) => {
    console.log('Add Note', id);
    // TODO: Implement add note logic
  };

  const handleDelete = (id: number) => {
    console.log('Delete', id);
    // TODO: Implement delete logic
  };

  const handleRotate = (id: number) => {
    console.log('Rotate', id);
    // TODO: Implement rotate logic
  };

  if (isLoading) return <div className="p-8 text-center">Loading images...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ChevronLeft size={24} />
          </Button>
          <h2 className="text-2xl font-bold text-gray-800">이미지 목록</h2>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg border">
          <Button
            variant={viewMode === 'smallThumb' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('smallThumb')}
            className={viewMode === 'smallThumb' ? 'bg-white shadow-sm' : ''}
          >
            <LayoutGrid size={12} />
          </Button>
          <Button
            variant={viewMode === 'thumb' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('thumb')}
            className={viewMode === 'thumb' ? 'bg-white shadow-sm' : ''}
          >
            <LayoutGrid size={20} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-white shadow-sm' : ''}
          >
            <ListIcon size={20} />
          </Button>
        </div>
      </div>

      {viewMode === 'thumb' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
          {images?.map((img) => (
            <ImageThumbCard1
              key={img.id}
              image={img}
              isSelected={selectedIds.includes(img.id)}
              onImageClick={(id) => navigate(`/image/${id}`)}
              onSelect={handleSelect}
              onRename={handleRename}
              onAddNote={handleAddNote}
              onDelete={handleDelete}
              onRotate={handleRotate}
            />
          ))}
        </div>
      ) : viewMode === 'smallThumb' ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {images?.map((img) => (
            <ImageThumbCard1
              key={img.id}
              image={img}
              isSelected={selectedIds.includes(img.id)}
              onImageClick={(id) => navigate(`/image/${id}`)}
              onSelect={handleSelect}
              onRename={handleRename}
              onAddNote={handleAddNote}
              onDelete={handleDelete}
              onRotate={handleRotate}
            />
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
                <th className="px-4 py-3">노트</th>
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
                  <td className="px-4 py-3 text-sm text-gray-600 truncate">{img.note}</td>
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
