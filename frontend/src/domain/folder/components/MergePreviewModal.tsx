import { useEffect, useState } from 'react';
import { X, ImageIcon } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { OutputActionsPanel } from '@/shared/components/OutputActionsPanel';
import type { ArchiveMetaInput } from '@/shared/components/OutputActionsPanel';
import { useToast } from '@/shared/components/ui/use-toast';

interface MergePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  blob: Blob | null;
  filename: string;
  elapsedMs?: number | null;
  sourceFolderId?: number | null;
  autoNote?: string;
}

// 클립보드 이미지 복사는 브라우저 호환성상 image/png 타입만 안정적으로 지원되므로
// 서버에서 받은 jpg blob을 canvas를 거쳐 png로 변환한다.
const convertBlobToPng = (blob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context를 생성할 수 없습니다.'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(url);
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error('PNG 변환에 실패했습니다.'));
        }
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };
    img.src = url;
  });
};

export const MergePreviewModal = ({ isOpen, onClose, blob, filename, elapsedMs, sourceFolderId, autoNote }: MergePreviewModalProps) => {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && blob) {
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setCopyError(null);
      return () => URL.revokeObjectURL(url);
    }
    setImageUrl(null);
  }, [isOpen, blob]);

  if (!isOpen || !blob) return null;

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const uploadToArchive = async (meta: ArchiveMetaInput) => {
    if (!blob) return;
    const dfn = meta.displayFilename || filename;
    const formData = new FormData();
    formData.append('file', blob, dfn);
    formData.append('type', 'MERGE');
    formData.append('displayFilename', dfn);
    if (meta.note) formData.append('note', meta.note);
    if (sourceFolderId != null) formData.append('sourceFolderId', String(sourceFolderId));
    if (elapsedMs != null) formData.append('elapsedMs', String(elapsedMs));
    await apiClient.post('/archive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    toast({ title: '성공', description: '병합 이미지가 보관소에 저장되었습니다.' });
  };

  const handleCopy = async () => {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      setCopyError('이 브라우저에서는 이미지 클립보드 복사를 지원하지 않습니다. 다운로드를 이용해주세요.');
      return;
    }
    setCopyError(null);
    try {
      const pngBlob = await convertBlobToPng(blob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      setCopyError('클립보드 복사에 실패했습니다. 다운로드를 이용해주세요.');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b bg-gray-50/70 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="text-indigo-600" size={22} />
            병합 결과 미리보기
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 cursor-pointer"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="병합 결과 미리보기"
              className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm bg-white"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t bg-gray-50/70 shrink-0 space-y-3">
          {copyError && <p className="text-xs text-red-600 text-right">{copyError}</p>}
          <OutputActionsPanel
            elapsedMs={elapsedMs ?? null}
            defaultFilename={filename}
            initialNote={autoNote}
            onDownload={handleDownload}
            onCopyToClipboard={handleCopy}
            onSaveToArchive={uploadToArchive}
            onSaveThenDownload={async (meta) => {
              await uploadToArchive(meta);
              handleDownload();
            }}
          />
        </div>
      </div>
    </div>
  );
};
