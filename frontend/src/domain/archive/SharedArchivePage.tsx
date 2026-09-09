import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Download,
  FileText,
  ImageIcon,
  Film,
  Sparkles,
  Lock,
  Calendar,
  HardDrive,
  Clock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { formatDate, formatFileSize } from '@/lib/utils';
import { formatElapsed } from '@/shared/utils/elapsedTime';

interface PublicArchivedOutput {
  id: number;
  type: 'PDF' | 'MERGE' | 'COLLAGE' | 'EFFECT' | 'SLIDESHOW';
  displayFilename: string;
  note: string | null;
  fileSize: number;
  fileExtension: string;
  elapsedMs: number | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof ImageIcon; colorClass: string }
> = {
  PDF: { label: 'PDF 문서', icon: FileText, colorClass: 'text-red-600 bg-red-50 border-red-200' },
  MERGE: { label: '병합 이미지', icon: ImageIcon, colorClass: 'text-blue-600 bg-blue-50 border-blue-200' },
  COLLAGE: { label: '콜라쥬', icon: Sparkles, colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  EFFECT: { label: '효과 이미지', icon: Sparkles, colorClass: 'text-amber-600 bg-amber-50 border-amber-200' },
  SLIDESHOW: { label: '슬라이드쇼 영상', icon: Film, colorClass: 'text-purple-600 bg-purple-50 border-purple-200' },
};

export const SharedArchivePage = () => {
  const { shareKey } = useParams<{ shareKey: string }>();
  const [item, setItem] = useState<PublicArchivedOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!shareKey) {
      setErrorStatus(404);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorStatus(null);

    // 비로그인 사용자 지원을 위해 apiClient 대신 일반 axios 사용
    axios
      .get<PublicArchivedOutput>(`/sofia/api/archive/public/${shareKey}`)
      .then((res) => {
        setItem(res.data);
        setErrorStatus(null);
      })
      .catch((err) => {
        const status = err.response?.status || 500;
        setErrorStatus(status);
        setItem(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [shareKey]);

  const handleDownload = async () => {
    if (!shareKey || !item || isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await axios.get(`/sofia/api/archive/public/${shareKey}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.displayFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const viewUrl = shareKey ? `/sofia/api/archive/public/${shareKey}/view` : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="animate-spin text-emerald-600 mb-3" size={36} />
        <p className="text-sm font-medium text-gray-600">공유 파일을 불러오는 중...</p>
      </div>
    );
  }

  if (errorStatus || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">접근할 수 없는 링크입니다</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            해당 보관소 항목이 비공개로 전환되었거나, 링크 주소가 올바르지 않습니다.
          </p>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="outline" size="sm" className="cursor-pointer">
                Sofia 로그인으로 이동
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[item.type] || {
    label: item.type,
    icon: FileText,
    colorClass: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  const TypeIcon = typeConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              S
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">
                {item.displayFilename}
              </h1>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                SOFIA SHARED ARCHIVE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="새 탭에서 원본 미디어 보기"
            >
              <ExternalLink size={13} />
              <span>새 탭에서 열기</span>
            </a>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              {isDownloading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span className="hidden sm:inline">다운로드</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Viewer Box */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-4 sm:p-6 flex items-center justify-center bg-gray-100/50 min-h-[450px]">
          {(() => {
            const ext = (item.fileExtension || item.displayFilename.split('.').pop() || '').toLowerCase();
            const isVideo = item.type === 'SLIDESHOW' || ext === 'mp4';
            const isPdf = item.type === 'PDF' || ext === 'pdf';

            if (isVideo) {
              return (
                <video
                  src={viewUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="max-w-full max-h-[75vh] rounded-xl shadow-md bg-black"
                />
              );
            }

            if (isPdf) {
              return (
                <div className="w-full h-full flex flex-col items-center">
                  <iframe
                    src={viewUrl}
                    className="w-full h-[75vh] rounded-xl border border-gray-200 bg-white shadow-sm"
                    title={item.displayFilename}
                  />
                  <div className="mt-2.5 flex items-center justify-between w-full px-2 text-xs text-gray-500">
                    <span>PDF가 브라우저에서 바로 열리지 않을 경우:</span>
                    <a
                      href={viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <ExternalLink size={11} /> 새 탭에서 열기
                    </a>
                  </div>
                </div>
              );
            }

            return (
              <img
                src={viewUrl}
                alt={item.displayFilename}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md bg-white border border-gray-200"
              />
            );
          })()}
        </div>

        {/* File Metadata Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeConfig.colorClass}`}
                >
                  <TypeIcon size={12} />
                  {typeConfig.label}
                </span>
                <span className="text-xs text-gray-400 font-mono uppercase">
                  .{item.fileExtension}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 break-all">
                {item.displayFilename}
              </h2>
            </div>

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm self-start sm:self-auto shrink-0"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>파일 다운로드 ({formatFileSize(item.fileSize)})</span>
            </Button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 pt-1">
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">생성일시</p>
                <p className="font-medium text-gray-800">{formatDate(item.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <HardDrive size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">파일 크기</p>
                <p className="font-medium text-gray-800">{formatFileSize(item.fileSize)}</p>
              </div>
            </div>

            {item.elapsedMs != null && item.elapsedMs > 0 && (
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">생성 소요 시간</p>
                  <p className="font-medium text-gray-800">{formatElapsed(item.elapsedMs)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Note Area */}
          {item.note && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-1.5">메모</p>
              <div className="bg-gray-50 rounded-xl p-3.5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100 font-sans">
                {item.note}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        © SOFIA Image Management & Viewer System
      </footer>
    </div>
  );
};
