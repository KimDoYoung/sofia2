import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Download, Archive, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { formatElapsed } from '@/shared/utils/elapsedTime';

export interface ArchiveMetaInput {
  note?: string;
  displayFilename?: string;
}

interface OutputActionsPanelProps {
  elapsedMs: number | null;
  onDownload: () => void | Promise<void>;
  onSaveToArchive: (meta: ArchiveMetaInput) => Promise<void>;
  onSaveThenDownload: (meta: ArchiveMetaInput) => Promise<void>;
  onCopyToClipboard?: () => Promise<void>;
  defaultFilename: string;
  initialNote?: string;
  /** 저장(또는 저장 후 다운로드) 성공 시 호출됩니다. 보통 모달을 닫는 데 사용합니다. */
  onClose?: () => void;
}

export const OutputActionsPanel = ({
  elapsedMs,
  onDownload,
  onSaveToArchive,
  onSaveThenDownload,
  onCopyToClipboard,
  defaultFilename,
  initialNote = '',
  onClose,
}: OutputActionsPanelProps) => {
  const [displayFilename, setDisplayFilename] = useState(defaultFilename);
  const [note, setNote] = useState(initialNote);
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!onCopyToClipboard || isCopying) return;
    setIsCopying(true);
    try {
      await onCopyToClipboard();
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // 에러는 onCopyToClipboard 내부에서 처리/전달
    } finally {
      setIsCopying(false);
    }
  };

  const getMeta = (): ArchiveMetaInput => ({
    displayFilename: displayFilename.trim() || defaultFilename,
    note: note.trim() || undefined,
  });

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveToArchive(getMeta());
      if (onClose) {
        onClose();
      } else {
        setIsSaving(false);
      }
    } catch {
      setSaveError('보관소 저장에 실패했습니다.');
      setIsSaving(false);
    }
  };

  const handleSaveThenDownload = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveThenDownload(getMeta());
      if (onClose) {
        onClose();
      } else {
        setIsSaving(false);
      }
    } catch {
      setSaveError('저장 후 다운로드에 실패했습니다.');
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {elapsedMs != null && elapsedMs > 0 && (
        <p className="text-sm text-gray-500 text-center font-medium">
          생성 완료 ({formatElapsed(elapsedMs)})
        </p>
      )}

      <button
        type="button"
        onClick={() => setIsMetaOpen(!isMetaOpen)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isMetaOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        파일명 / 메모 편집
      </button>

      {isMetaOpen && (
        <div className="space-y-2">
          <input
            type="text"
            value={displayFilename}
            onChange={e => setDisplayFilename(e.target.value)}
            placeholder="파일명"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="메모 (선택)"
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
          />
        </div>
      )}

      {saveError && (
        <p className="text-xs text-red-600">{saveError}</p>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        {onCopyToClipboard && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={isCopying}
            className={`gap-1.5 cursor-pointer transition-colors ${
              isCopied ? 'border-emerald-500 text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : ''
            }`}
          >
            {isCopying ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isCopied ? (
              <Check size={14} className="text-emerald-600" />
            ) : (
              <Copy size={14} />
            )}
            <span>{isCopied ? '복사 완료!' : '클립보드로 복사'}</span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="gap-1.5 cursor-pointer"
        >
          <Download size={14} />
          다운로드
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Archive size={14} />
          )}
          보관소에 저장
        </Button>
        <Button
          size="sm"
          onClick={handleSaveThenDownload}
          disabled={isSaving}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Archive size={14} />
          )}
          보관소 저장 후 다운로드
        </Button>
      </div>
    </div>
  );
};
