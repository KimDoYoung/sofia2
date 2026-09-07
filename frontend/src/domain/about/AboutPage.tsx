import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  Layers,
  Zap,
  LayoutGrid,
  Combine,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  GitCommit,
  Calendar,
  Sparkles,
  Server,
  Code2,
  Database,
  CheckCircle2,
} from 'lucide-react';
import pdfIcon from '@/assets/icons/pdf.svg';

interface HistoryItem {
  version: string;
  date: string;
  changes: string[];
}

export default function AboutPage() {
  const navigate = useNavigate();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Health check for current backend version
  const { data: healthData } = useQuery<{ version?: string; time?: string; status?: string }>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await axios.get('/sofia/health');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch version history from backend
  const { data: historyList, isLoading: isHistoryLoading, isError: isHistoryError } = useQuery<HistoryItem[]>({
    queryKey: ['history'],
    queryFn: async () => {
      try {
        const res = await axios.get('/sofia/api/history');
        if (Array.isArray(res.data)) return res.data;
      } catch {
        // fallback
      }
      try {
        const res = await axios.get('/sofia/history');
        if (Array.isArray(res.data)) return res.data;
      } catch {
        // fallback
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentVersion = healthData?.version ? `v${healthData.version}` : 'v0.3.0';

  return (
    <div className="max-w-5xl mx-auto py-6 px-2 sm:px-4 space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} />
          돌아가기
        </button>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Sofia 2 System Guide</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5">
              <Sparkles size={13} className="text-yellow-300" />
              Modern Image Platform
            </span>
            <span className="px-3 py-1 bg-blue-500/40 border border-white/20 rounded-full text-xs font-bold font-mono">
              {currentVersion}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Project Sofia 2
          </h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl leading-relaxed">
            폴더 단위 대용량 이미지 아카이브를 효율적으로 탐색하고, EXIF 분석, 병합(Merge) 및 PDF 내보내기를 지원하는 차세대 고성능 웹 이미지 뷰어 시스템입니다.
          </p>
        </div>
      </div>

      {/* Core Features */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Layers className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-gray-900">핵심 기능 및 특징</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <LayoutGrid size={22} />
            </div>
            <h3 className="font-bold text-gray-800 text-base">스마트 폴더 & 메타데이터</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              물리 디렉토리 자동 스캔 및 PostgreSQL 메타데이터 동기화. 카메라 EXIF 정보, 해상도, 파일 크기 등 세부 정보를 실시간으로 추출합니다.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Zap size={22} />
            </div>
            <h3 className="font-bold text-gray-800 text-base">초고속 썸네일 파이프라인</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Thumbnailator 엔진 기반 비동기 썸네일 캐싱 시스템으로 수천 장의 사진도 버벅임 없이 쾌적하게 갤러리 및 그리드 뷰로 탐색할 수 있습니다.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Combine size={22} />
            </div>
            <h3 className="font-bold text-gray-800 text-base">다중 이미지 병합 (Merge)</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              선택한 다수의 이미지를 1행~4행의 그리드로 합성. 테두리 두께/색상, 상하좌우 간격, A4 비율 맞춤 등 상세 옵션을 제공합니다.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <img src={pdfIcon} alt="PDF" className="w-5 h-5 object-contain" />
            </div>
            <h3 className="font-bold text-gray-800 text-base">PDF 문서 내보내기</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              원하는 사진들을 골라 다양한 분할 레이아웃(1, 2-V, 2-H, 3, 4, 6분할)과 여백/테두리 스타일을 적용하여 고품질 PDF로 즉시 다운로드합니다.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <h3 className="font-bold text-gray-800 text-base">안전한 보안 및 토큰 인증</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Spring Security와 HttpOnly 쿠키 기반 JWT 인증 체계로 Access/Refresh 토큰의 안전한 보호 및 세션리스 보안 아키텍처를 구현했습니다.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Sparkles size={22} />
            </div>
            <h3 className="font-bold text-gray-800 text-base">모던 UI & 반응형 지원</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              React 19, Tailwind CSS 4, shadcn/ui, AG Grid를 적용하여 데스크탑은 물론 모바일 및 태블릿에서도 최적화된 사용 경험을 제공합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Code2 className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-gray-900">기술 스택 (Architecture)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Frontend */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <Code2 size={18} />
              프론트엔드 (Frontend)
            </div>
            <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
              <li><span className="font-medium text-gray-800">React 19</span> & <span className="font-medium text-gray-800">Vite</span></li>
              <li><span className="font-medium text-gray-800">Tailwind CSS 4</span> & shadcn/ui</li>
              <li><span className="font-medium text-gray-800">AG Grid Community</span></li>
              <li><span className="font-medium text-gray-800">TanStack Query v5</span></li>
              <li><span className="font-medium text-gray-800">Zustand</span> (전역 상태 관리)</li>
              <li><span className="font-medium text-gray-800">React Router 7</span></li>
            </ul>
          </div>

          {/* Backend */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <Server size={18} />
              백엔드 (Backend)
            </div>
            <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
              <li><span className="font-medium text-gray-800">Spring Boot 3.4.x</span></li>
              <li><span className="font-medium text-gray-800">Java 17 / 21</span></li>
              <li><span className="font-medium text-gray-800">Spring Security</span> (HttpOnly JWT)</li>
              <li><span className="font-medium text-gray-800">Spring Data JPA</span> (Hibernate)</li>
              <li><span className="font-medium text-gray-800">Thumbnailator</span> (썸네일 생성)</li>
              <li><span className="font-medium text-gray-800">iText 7 / jsPDF</span> (문서 엔진)</li>
            </ul>
          </div>

          {/* Database & Ops */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <Database size={18} />
              데이터베이스 & 환경
            </div>
            <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
              <li><span className="font-medium text-gray-800">PostgreSQL</span> (Schema: sofia)</li>
              <li><span className="font-medium text-gray-800">Gradle 8.x</span> (Spotless 포맷팅)</li>
              <li><span className="font-medium text-gray-800">스크립트 자동화</span> (./bm.sh, ./fm.sh)</li>
              <li><span className="font-medium text-gray-800">리눅스 환경 최적화</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Accordion Version History (Initially Hidden) */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <GitCommit size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">버전별 개정 이력 (Changelog)</h3>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                    {Array.isArray(historyList) ? historyList.length : 0} releases
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  클릭하여 Sofia 2의 주요 업데이트 내역과 릴리즈 노트를 확인하세요.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-600 hidden sm:inline">
                {isHistoryOpen ? '접기' : '펼쳐보기'}
              </span>
              <div className="p-1 rounded-lg bg-gray-100 text-gray-600">
                {isHistoryOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
          </button>

          {/* Foldable Content */}
          {isHistoryOpen && (
            <div className="p-5 sm:p-6 border-t bg-gray-50/50 space-y-6 animate-in slide-in-from-top-2 duration-200">
              {isHistoryLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  개정 이력을 불러오는 중입니다...
                </div>
              ) : isHistoryError ? (
                <div className="text-center py-8 text-sm text-red-500">
                  개정 이력을 불러오는 중 문제가 발생했습니다.
                </div>
              ) : Array.isArray(historyList) && historyList.length > 0 ? (
                <div className="relative border-l-2 border-blue-200 ml-4 sm:ml-6 space-y-8 pl-6">
                  {historyList.map((item, idx) => (
                    <div key={item.version || idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-blue-600 group-hover:scale-125 transition-transform" />

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 text-xs font-bold font-mono bg-blue-600 text-white rounded-md shadow-xs">
                            {item.version}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Calendar size={13} />
                            {item.date}
                          </span>
                          {idx === 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                              Latest
                            </span>
                          )}
                        </div>

                        <ul className="space-y-1.5 pt-1">
                          {Array.isArray(item.changes) &&
                            item.changes.map((change, cIdx) => (
                              <li key={cIdx} className="text-xs text-gray-600 flex items-start gap-2">
                                <CheckCircle2 size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{change}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  등록된 개정 이력이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="pt-6 border-t text-center text-xs text-gray-400 space-y-1">
        <p>© 2026 Project Sofia 2. All rights reserved.</p>
        <p>Built with Spring Boot 3.4 & React 19</p>
      </div>
    </div>
  );
}
