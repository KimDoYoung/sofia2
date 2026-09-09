import { X, Archive } from 'lucide-react';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';

interface PreviewItem {
  id: number;
  type: string;
  displayFilename: string;
}

interface ArchivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PreviewItem | null;
}

export const ArchivePreviewModal = ({ isOpen, onClose, item }: ArchivePreviewModalProps) => {
  useEscapeKey(isOpen, onClose);

  if (!isOpen || !item) return null;

  const viewUrl = `/sofia/api/archive/${item.id}/view`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 px-6 border-b bg-gray-50/70 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 min-w-0">
            <Archive className="text-emerald-600 shrink-0" size={22} />
            <span className="truncate" title={item.displayFilename}>
              {item.displayFilename}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 cursor-pointer shrink-0"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center">
          {item.type === 'SLIDESHOW' ? (
            <video
              src={viewUrl}
              controls
              autoPlay
              className="max-w-full max-h-[75vh] rounded-lg shadow-sm bg-black"
            />
          ) : item.type === 'PDF' ? (
            <iframe
              src={viewUrl}
              className="w-full h-[75vh] rounded-lg border bg-white"
              title={item.displayFilename}
            />
          ) : (
            <img
              src={viewUrl}
              alt={item.displayFilename}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};
