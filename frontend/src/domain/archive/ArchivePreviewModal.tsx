import { X, Archive, ExternalLink } from 'lucide-react';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';

interface PreviewItem {
  id: number;
  type: string;
  displayFilename: string;
  fileExtension?: string;
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
  const ext = (item.fileExtension || item.displayFilename.split('.').pop() || '').toLowerCase();
  const isVideo = item.type === 'SLIDESHOW' || ext === 'mp4';
  const isPdf = item.type === 'PDF' || ext === 'pdf';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-4 px-6 border-b bg-gray-50/70 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 min-w-0">
            <Archive className="text-emerald-600 shrink-0" size={22} />
            <span className="truncate" title={item.displayFilename}>
              {item.displayFilename}
            </span>
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="새 탭에서 원본 보기"
            >
              <ExternalLink size={13} />
              <span>새 탭에서 열기</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 cursor-pointer"
              title="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-100 flex flex-col items-center justify-center min-h-[400px]">
          {isVideo ? (
            <video
              src={viewUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="max-w-full max-h-[78vh] rounded-lg shadow-sm bg-black"
            />
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col items-center">
              <iframe
                src={viewUrl}
                className="w-full h-[76vh] rounded-lg border border-gray-200 bg-white shadow-sm"
                title={item.displayFilename}
              />
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                <span>PDF가 브라우저에서 바로 열리지 않을 경우:</span>
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ExternalLink size={11} /> 새 탭에서 열기
                </a>
              </div>
            </div>
          ) : (
            <img
              src={viewUrl}
              alt={item.displayFilename}
              className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-sm bg-white border border-gray-200"
            />
          )}
        </div>
      </div>
    </div>
  );
};
