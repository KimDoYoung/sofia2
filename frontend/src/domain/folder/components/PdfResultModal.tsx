import { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { OutputActionsPanel } from '@/shared/components/OutputActionsPanel';
import type { ArchiveMetaInput } from '@/shared/components/OutputActionsPanel';
import { useToast } from '@/shared/components/ui/use-toast';

interface PdfResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  blob: Blob | null;
  filename: string;
  elapsedMs: number | null;
  sourceFolderId?: number | null;
  autoNote?: string;
}

export const PdfResultModal = ({
  isOpen,
  onClose,
  blob,
  filename,
  elapsedMs,
  sourceFolderId,
  autoNote,
}: PdfResultModalProps) => {
  const { toast } = useToast();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && blob) {
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setBlobUrl(null);
  }, [isOpen, blob]);

  if (!isOpen || !blob) return null;

  const handleDownload = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const uploadToArchive = async (meta: ArchiveMetaInput) => {
    const dfn = meta.displayFilename || filename;
    const formData = new FormData();
    formData.append('file', blob, dfn);
    formData.append('type', 'PDF');
    formData.append('displayFilename', dfn);
    if (meta.note) formData.append('note', meta.note);
    if (sourceFolderId != null) formData.append('sourceFolderId', String(sourceFolderId));
    if (elapsedMs != null) formData.append('elapsedMs', String(elapsedMs));
    await apiClient.post('/archive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    toast({ title: '성공', description: 'PDF가 보관소에 저장되었습니다.' });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-4 px-6 border-b bg-gray-50/70 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-red-500" size={22} />
            PDF 생성 완료
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            <FileText size={32} className="text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 break-all">{filename}</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF 문서</p>
            </div>
          </div>
          <OutputActionsPanel
            elapsedMs={elapsedMs}
            defaultFilename={filename}
            initialNote={autoNote}
            onDownload={handleDownload}
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
