import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Download, Archive, ChevronDown, ChevronUp, Copy } from 'lucide-react';
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
}

export const OutputActionsPanel = ({
  elapsedMs,
  onDownload,
  onSaveToArchive,
  onSaveThenDownload,
  onCopyToClipboard,
  defaultFilename,
  initialNote = '',
}: OutputActionsPanelProps) => {
  const [displayFilename, setDisplayFilename] = useState(defaultFilename);
  const [note, setNote] = useState(initialNote);
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const getMeta = (): ArchiveMetaInput => ({
    displayFilename: displayFilename.trim() || defaultFilename,
    note: note.trim() || undefined,
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveToArchive(getMeta());
    } catch {
      setSaveError('보관소 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveThenDownload = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveThenDownload(getMeta());
    } catch {
      setSaveError('저장 후 다운로드에 실패했습니다.');
    } finally {
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
            onClick={onCopyToClipboard}
            className="gap-1.5 cursor-pointer"
          >
            <Copy size={14} />
            클립보드로 복사
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
          저장 후 다운로드
        </Button>
      </div>
    </div>
  );
};
