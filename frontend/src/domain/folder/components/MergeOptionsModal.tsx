import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { X, Layers, Check, Palette } from 'lucide-react';

export interface MergeOptions {
  border: boolean;
  borderWidth: number;
  borderColor: string;
  cols: number;
  widthMode: 'A4' | 'original' | '1900' | 'custom';
  customWidth: number;
  gapX: number;
  gapY: number;
}

interface MergeOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (options: MergeOptions) => void;
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

const GAP_PRESETS = [
  { label: '없음', value: 0 },
  { label: '1px', value: 1 },
  { label: '2px', value: 2 },
  { label: '3px', value: 3 },
  { label: '4px', value: 4 },
  { label: '5px', value: 5 },
];

export const MergeOptionsModal = ({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
  isProcessing,
}: MergeOptionsModalProps) => {
  // 테두리선 상태
  const [border, setBorder] = useState<boolean>(false);
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [borderColor, setBorderColor] = useState<string>('#000000');

  // row당 갯수 (1, 2, 3, 4)
  const [cols, setCols] = useState<number>(2);

  // 너비 선택 (A4, original, 1900, custom)
  const [widthMode, setWidthMode] = useState<'A4' | 'original' | '1900' | 'custom'>('A4');
  const [customWidth, setCustomWidth] = useState<number>(2048);

  // 이미지 간격 (X, Y)
  const [gapX, setGapX] = useState<number>(3);
  const [isGapXCustom, setIsGapXCustom] = useState<boolean>(false);

  const [gapY, setGapY] = useState<number>(3);
  const [isGapYCustom, setIsGapYCustom] = useState<boolean>(false);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setBorder(false);
      setBorderWidth(1);
      setBorderColor('#000000');
      setCols(2);
      setWidthMode('A4');
      setCustomWidth(2048);
      setGapX(3);
      setIsGapXCustom(false);
      setGapY(3);
      setIsGapYCustom(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      border,
      borderWidth,
      borderColor,
      cols,
      widthMode,
      customWidth: widthMode === 'custom' ? (customWidth > 0 ? customWidth : 2048) : 2048,
      gapX: gapX >= 0 ? gapX : 0,
      gapY: gapY >= 0 ? gapY : 0,
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
              <Layers className="text-indigo-600" size={22} />
              이미지 병합 설정 (Merge)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              선택한 <span className="font-semibold text-indigo-600">{selectedCount}개</span>의 이미지를 하나의 이미지 파일로 병합합니다.
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
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 1. 테두리선 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800">테두리선</label>
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
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  테두리 적용
                </button>
              </div>
            </div>

            {border && (
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* 두께 선택 */}
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
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* 색깔 선택 */}
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
                            ? 'ring-2 ring-indigo-600 ring-offset-1'
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

                    {/* 커스텀 컬러 피커 */}
                    <div className="relative flex items-center gap-1.5 ml-1">
                      <label
                        htmlFor="merge-color-input"
                        className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50 cursor-pointer shadow-xs"
                        title="직접 색상 선택"
                      >
                        <Palette size={14} className="text-gray-600" />
                      </label>
                      <input
                        id="merge-color-input"
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

                {/* 미리보기 */}
                <div className="pt-2 border-t border-gray-200 flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 font-medium">테두리 미리보기:</span>
                  <div
                    className="w-16 h-8 bg-white rounded flex items-center justify-center text-[10px] text-gray-400 font-mono shadow-xs"
                    style={{
                      border: `${borderWidth}px solid ${borderColor}`,
                    }}
                  >
                    Image
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Row당 갯수 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800">Row당 이미지 갯수</label>
              <span className="text-xs text-gray-400">한 행에 나열할 이미지 수</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCols(num)}
                  className={`py-2.5 text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                    cols === num
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {num}개
                </button>
              ))}
            </div>
          </div>

          {/* 3. Width 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800">너비 (Width) 선택</label>
              <span className="text-xs text-gray-400">병합 이미지 기준 너비</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'A4' as const, label: 'A4', sub: '2048px' },
                { id: 'original' as const, label: '원본유지', sub: '원본 크기 기준' },
                { id: '1900' as const, label: '1900', sub: '1900px' },
                { id: 'custom' as const, label: '사용자 입력', sub: '직접 너비(px) 지정' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWidthMode(opt.id)}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    widthMode === opt.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-bold text-sm">{opt.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>

            {widthMode === 'custom' && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-gray-700 shrink-0">가로 너비(px):</span>
                <Input
                  type="number"
                  min={100}
                  max={10000}
                  step={10}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value, 10) || 0)}
                  className="h-8 text-sm"
                  placeholder="2048"
                />
                <span className="text-xs text-gray-500 shrink-0">px</span>
              </div>
            )}
          </div>

          {/* 4. 이미지 간격 (X축, Y축) */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-800 block">이미지 간격 (Gap)</label>

            {/* X축 간격 */}
            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">X축 간격 (가로)</span>
                <span className="text-xs font-semibold text-indigo-600">{gapX}px</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {GAP_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setGapX(p.value);
                      setIsGapXCustom(false);
                    }}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      !isGapXCustom && gapX === p.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsGapXCustom(true)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                    isGapXCustom
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  직접입력
                </button>
              </div>

              {isGapXCustom && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={gapX}
                    onChange={(e) => setGapX(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="h-8 text-xs"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">px</span>
                </div>
              )}
            </div>

            {/* Y축 간격 */}
            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Y축 간격 (세로)</span>
                <span className="text-xs font-semibold text-indigo-600">{gapY}px</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {GAP_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setGapY(p.value);
                      setIsGapYCustom(false);
                    }}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                      !isGapYCustom && gapY === p.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsGapYCustom(true)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                    isGapYCustom
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  직접입력
                </button>
              </div>

              {isGapYCustom && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={gapY}
                    onChange={(e) => setGapY(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="h-8 text-xs"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">px</span>
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold min-w-[120px] shadow-sm"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>병합 중...</span>
              </div>
            ) : (
              '병합 실행'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
