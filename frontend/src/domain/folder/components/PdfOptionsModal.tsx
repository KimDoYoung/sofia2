import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { X, Check, Palette } from 'lucide-react';
import pdfIcon from '@/assets/icons/pdf.svg';

export interface PdfExportOptions {
  orientation: 'auto' | 'portrait' | 'landscape';
  pdfLayout: '1' | '2-v' | '2-h' | '3' | '4' | '6';
  fitMode: 'contain' | 'cover';
  pageMargin: number;
  gap: number;
  border: boolean;
  borderWidth: number;
  borderColor: string;
}

interface PdfOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (options: PdfExportOptions) => void;
  isProcessing: boolean;
}

const PRESET_COLORS = [
  { label: '블랙', value: '#000000' },
  { label: '진회색', value: '#4B5563' },
  { label: '연회색', value: '#D1D5DB' },
  { label: '화이트', value: '#FFFFFF' },
  { label: '레드', value: '#EF4444' },
  { label: '블루', value: '#3B82F6' },
];

const MARGIN_PRESETS = [
  { label: '없음 (0pt)', value: 0 },
  { label: '좁게 (10pt)', value: 10 },
  { label: '보통 (20pt)', value: 20 },
  { label: '인쇄용 (36pt)', value: 36 },
];

const GAP_PRESETS = [
  { label: '없음', value: 0 },
  { label: '2pt', value: 2 },
  { label: '5pt', value: 5 },
  { label: '10pt', value: 10 },
];

export const PdfOptionsModal = ({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
  isProcessing,
}: PdfOptionsModalProps) => {
  // 방향
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');

  // 레이아웃
  const [pdfLayout, setPdfLayout] = useState<'1' | '2-v' | '2-h' | '3' | '4' | '6'>('1');

  // 맞춤 모드
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  // 여백 및 간격
  const [pageMargin, setPageMargin] = useState<number>(10);
  const [gap, setGap] = useState<number>(2);
  const [isGapCustom, setIsGapCustom] = useState<boolean>(false);

  // 테두리선
  const [border, setBorder] = useState<boolean>(false);
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [borderColor, setBorderColor] = useState<string>('#000000');

  useEffect(() => {
    if (isOpen) {
      setOrientation('auto');
      setPdfLayout(selectedCount === 2 ? '2-v' : selectedCount === 3 ? '3' : selectedCount >= 4 ? '4' : '1');
      setFitMode('contain');
      setPageMargin(10);
      setGap(2);
      setIsGapCustom(false);
      setBorder(false);
      setBorderWidth(1);
      setBorderColor('#000000');
    }
  }, [isOpen, selectedCount]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      orientation,
      pdfLayout,
      fitMode,
      pageMargin: Math.max(0, pageMargin),
      gap: Math.max(0, gap),
      border,
      borderWidth,
      borderColor,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b bg-gray-50/70">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <img src={pdfIcon} className="w-5 h-5 object-contain" alt="PDF" />
              PDF 다운로드 설정
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              선택한 <span className="font-semibold text-blue-600">{selectedCount}개</span>의 이미지를 PDF 문서로 내보냅니다.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 disabled:opacity-30 cursor-pointer"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* 1. 페이지 방향 (세로 / 가로 / 자동) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800">페이지 방향 (Orientation)</label>
              <span className="text-xs text-gray-400">용지 가로/세로 전환</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'auto' as const, label: '스마트 자동', sub: '사진 형태에 맞춰 자동 전환' },
                { id: 'portrait' as const, label: '세로 (Portrait)', sub: 'A4 세로 (210×297mm)' },
                { id: 'landscape' as const, label: '가로 (Landscape)', sub: 'A4 가로 (297×210mm)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOrientation(opt.id)}
                  className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                    orientation === opt.id
                      ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 페이지당 이미지 배치 및 분할 방향 (Layout) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800">페이지당 이미지 배치 (Layout)</label>
              <span className="text-xs text-gray-400">분할 형태 선택</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '1' as const, label: '1장 (전체)', desc: '1페이지 1장 꽉 채움' },
                { id: '2-v' as const, label: '2장 (상/하 분할)', desc: '위아래 2분할 (1열 2행)' },
                { id: '2-h' as const, label: '2장 (좌/우 분할)', desc: '좌우 2분할 (2열 1행)' },
                { id: '3' as const, label: '3장 (2+1 채움)', desc: '상단 2장 + 하단 1장 꽉 채움' },
                { id: '4' as const, label: '4장 (2×2 격자)', desc: '2열 2행 균등 격자' },
                { id: '6' as const, label: '6장 (격자)', desc: '세로 2×3 / 가로 3×2' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPdfLayout(opt.id)}
                  className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                    pdfLayout === opt.id
                      ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. 용지 맞춤 모드 (Fit Mode) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800">용지 맞춤 모드 (Fit Mode)</label>
              <span className="text-xs text-gray-400">여백 처리 방식</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFitMode('contain')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  fitMode === 'contain'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-bold text-xs">비율 유지 (Contain)</div>
                <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  사진 원본을 자르지 않고 100% 보존합니다. (권장)
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFitMode('cover')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  fitMode === 'cover'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-bold text-xs">종이 꽉 채우기 (Cover & Crop)</div>
                <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  하얀 여백 없이 셀을 가득 채우고 가장자리를 크롭합니다.
                </div>
              </button>
            </div>
          </div>

          {/* 4. 테두리선 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800">테두리선 (Border)</label>
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setBorder(false)}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    !border
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  없음
                </button>
                <button
                  type="button"
                  onClick={() => setBorder(true)}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    border
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  테두리 적용
                </button>
              </div>
            </div>

            {border && (
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* 두께 */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-gray-600">두께 선택</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setBorderWidth(w)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          borderWidth === w
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {w}pt
                      </button>
                    ))}
                  </div>
                </div>

                {/* 색깔 */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-gray-600">색깔 선택</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setBorderColor(c.value)}
                        className={`group relative w-7 h-7 rounded-full border flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                          borderColor.toLowerCase() === c.value.toLowerCase()
                            ? 'ring-2 ring-blue-600 ring-offset-1'
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      >
                        {borderColor.toLowerCase() === c.value.toLowerCase() && (
                          <Check
                            size={14}
                            className={c.value === '#FFFFFF' ? 'text-gray-800' : 'text-white'}
                          />
                        )}
                      </button>
                    ))}

                    <div className="relative flex items-center gap-1.5 ml-1">
                      <label
                        htmlFor="pdf-color-input"
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50 cursor-pointer shadow-xs"
                        title="직접 색상 선택"
                      >
                        <Palette size={14} className="text-gray-600" />
                      </label>
                      <input
                        id="pdf-color-input"
                        type="color"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="sr-only"
                      />
                      <Input
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        placeholder="#000000"
                        className="h-7 w-22 text-xs font-mono px-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. 여백 및 간격 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 외곽 여백 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">용지 여백 (Margin)</label>
              <div className="grid grid-cols-2 gap-1.5">
                {MARGIN_PRESETS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPageMargin(m.value)}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      pageMargin === m.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 이미지 간격 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">이미지 간격 (Gap)</label>
              <div className="grid grid-cols-2 gap-1.5">
                {GAP_PRESETS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => {
                      setGap(g.value);
                      setIsGapCustom(false);
                    }}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      !isGapCustom && gap === g.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              {isGapCustom && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={gap}
                    onChange={(e) => setGap(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="h-7 text-xs"
                    placeholder="2"
                  />
                  <span className="text-[11px] text-gray-500">pt</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t bg-gray-50/70 flex gap-2 justify-end">
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold min-w-[120px] shadow-sm"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>생성 중...</span>
              </div>
            ) : (
              'PDF 생성'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
