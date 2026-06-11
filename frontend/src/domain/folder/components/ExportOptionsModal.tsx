import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { X, FileText, Layers } from 'lucide-react';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'pdf' | 'merge';
  onConfirm: (options: {
    imagesPerPage?: number;
    orientation?: string;
    mode?: string;
    cols?: number | null;
    gap?: number;
  }) => void;
  isProcessing: boolean;
}

export const ExportOptionsModal = ({
  isOpen,
  onClose,
  type,
  onConfirm,
  isProcessing
}: ExportOptionsModalProps) => {
  // PDF state
  const [imagesPerPage, setImagesPerPage] = useState<number>(1);
  const [orientation, setOrientation] = useState<string>('auto');

  // Merge state
  const [mergeMode, setMergeMode] = useState<string>('fitPage');
  const [cols, setCols] = useState<number>(0); // 0 means Auto
  const [gap, setGap] = useState<number>(2);

  // Reset states on open or type change
  useEffect(() => {
    if (isOpen) {
      setImagesPerPage(1);
      setOrientation('auto');
      setMergeMode('fitPage');
      setCols(0);
      setGap(2);
    }
  }, [isOpen, type]);

  // Adjust default columns when mergeMode changes
  useEffect(() => {
    if (mergeMode === 'scroll') {
      setCols(1); // default to 1 column for vertical stitching
    } else {
      setCols(0); // default to Auto grid for page-fit
    }
  }, [mergeMode]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'pdf') {
      onConfirm({
        imagesPerPage,
        orientation
      });
    } else {
      onConfirm({
        mode: mergeMode,
        cols: cols > 0 ? cols : null,
        gap
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {type === 'pdf' ? (
              <>
                <FileText className="text-blue-600" size={20} />
                PDF 다운로드 설정
              </>
            ) : (
              <>
                <Layers className="text-indigo-600" size={20} />
                이미지 병합 설정
              </>
            )}
          </h2>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 hover:bg-gray-255 rounded-full transition-colors text-gray-500 disabled:opacity-30 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {type === 'pdf' ? (
            /* PDF Options */
            <div className="space-y-5">
              {/* Images per page */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  페이지당 이미지 배치
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 1, label: '1개 (전체 채움)' },
                    { value: 2, label: '2개 (세로 배치)' },
                    { value: 4, label: '4개 (2x2 격자)' },
                    { value: 6, label: '6개 (2x3 격자)' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setImagesPerPage(opt.value)}
                      className={`py-2 px-3 text-sm rounded-lg border font-medium transition-all cursor-pointer ${
                        imagesPerPage === opt.value
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm'
                          : 'border-gray-250 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  페이지 방향
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'auto', label: '자동' },
                    { value: 'portrait', label: '세로' },
                    { value: 'landscape', label: '가로' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOrientation(opt.value)}
                      className={`py-2 px-3 text-xs rounded-lg border font-medium transition-all cursor-pointer ${
                        orientation === opt.value
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm'
                          : 'border-gray-250 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  자동 선택 시 각 이미지의 비율(가로형/세로형)에 맞춰 해당 페이지의 방향이 개별 결정됩니다.
                </p>
              </div>
            </div>
          ) : (
            /* Merge Options */
            <div className="space-y-5">
              {/* Merge Mode */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  병합 방식
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMergeMode('fitPage')}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      mergeMode === 'fitPage'
                        ? 'border-indigo-600 bg-indigo-50/30 text-indigo-950 shadow-sm'
                        : 'border-gray-250 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span className="block font-bold text-sm">A4 1페이지 맞춤</span>
                    <span className="block text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                      A4 비율 내에 격자로 알맞게 축소 배치합니다.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeMode('scroll')}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      mergeMode === 'scroll'
                        ? 'border-indigo-600 bg-indigo-50/30 text-indigo-950 shadow-sm'
                        : 'border-gray-250 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span className="block font-bold text-sm">세로로 이어 붙이기</span>
                    <span className="block text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                      지정한 열 개수대로 세로 스크롤 형태로 길게 잇습니다.
                    </span>
                  </button>
                </div>
              </div>

              {/* Columns */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  열 개수 (Columns)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { value: 0, label: '자동', disabled: mergeMode === 'scroll' },
                    { value: 1, label: '1열' },
                    { value: 2, label: '2열' },
                    { value: 3, label: '3열' },
                    { value: 4, label: '4열' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => setCols(opt.value)}
                      className={`py-2 text-xs rounded-lg border font-semibold transition-all cursor-pointer ${
                        cols === opt.value
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm'
                          : 'border-gray-250 hover:bg-gray-50 text-gray-655 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gap */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">
                  이미지 사이 간격 (Gap)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 0, label: '0px' },
                    { value: 2, label: '2px' },
                    { value: 10, label: '10px' },
                    { value: 20, label: '20px' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGap(opt.value)}
                      className={`py-2 text-xs rounded-lg border font-semibold transition-all cursor-pointer ${
                        gap === opt.value
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm'
                          : 'border-gray-250 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50/50 flex gap-2 justify-end">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isProcessing}
            className="text-gray-500 hover:bg-gray-100"
          >
            취소
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isProcessing}
            className={`font-semibold min-w-[80px] ${
              type === 'pdf' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isProcessing ? '생성 중...' : '다운로드'}
          </Button>
        </div>
      </div>
    </div>
  );
};
