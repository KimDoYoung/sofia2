import type { ImageFile } from '../types';
import { ImageThumbCard1 } from '@/shared/components/ImageThumbCard1';

interface ImageGridViewProps {
  images: ImageFile[];
  viewMode: 'thumb' | 'smallThumb';
  selectedIds: number[];
  refreshKey: number;
  onImageClick: (id: number) => void;
  onSelect: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onAddNote: (id: number, note?: string) => void;
  onDelete: (id: number) => void;
  onRotate: (id: number, angle: number) => void;
}

export const ImageGridView = ({
  images,
  viewMode,
  selectedIds,
  refreshKey,
  onImageClick,
  onSelect,
  onRename,
  onAddNote,
  onDelete,
  onRotate,
}: ImageGridViewProps) => {
  const containerClass = viewMode === 'thumb'
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6"
    : "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2";

  return (
    <div className={containerClass}>
      {images.map((img) => (
        <ImageThumbCard1
          key={img.id}
          image={img}
          isSelected={selectedIds.includes(img.id)}
          refreshKey={refreshKey}
          onImageClick={onImageClick}
          onSelect={onSelect}
          onRename={() => onRename(img.id, img.orgName)}
          onAddNote={() => onAddNote(img.id, img.note)}
          onDelete={() => onDelete(img.id)}
          onRotate={onRotate}
        />
      ))}
    </div>
  );
};
