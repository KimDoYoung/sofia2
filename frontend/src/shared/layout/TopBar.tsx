import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Bookmark, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { useState } from 'react';

interface BookmarkDto {
  id: number;
  imageId: number;
  folderId: number;
  imageName: string;
  folderName: string;
  name: string;
  createdAt: string;
}

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { name, clearAuth } = useAuthStore();
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Extract folderId from pathname (e.g., /folder/12)
  const folderMatch = location.pathname.match(/\/folder\/(\d+)/);
  const currentFolderId = folderMatch ? parseInt(folderMatch[1], 10) : null;

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await axios.get('/sofia/health');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: folders } = useQuery<{ id: number; folderName: string }[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await apiClient.get('/folders');
      return res.data;
    },
    enabled: !!currentFolderId,
  });

  const { data: bookmarks } = useQuery<BookmarkDto[]>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await apiClient.get('/bookmarks');
      return res.data;
    },
    enabled: isBookmarkModalOpen,
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/bookmarks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  const currentFolderIndex = folders?.findIndex(f => f.id === currentFolderId);
  const prevFolderId = currentFolderIndex !== undefined && currentFolderIndex > 0 
    ? folders?.[currentFolderIndex - 1].id 
    : null;
  const nextFolderId = currentFolderIndex !== undefined && currentFolderIndex < (folders?.length || 0) - 1 
    ? folders?.[currentFolderIndex + 1].id 
    : null;

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
      clearAuth();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-6">
        <h1
          className="text-xl font-bold text-blue-600 cursor-pointer flex items-baseline gap-2"
          onClick={() => navigate('/')}
        >
          Sofia
          {healthData?.version && <span className="text-xs text-blue-400 font-medium tracking-wide">v{healthData.version}</span>}
          <span className="text-xs text-gray-400 font-normal">view of images in folder</span>
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {currentFolderId && folders && (
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border mr-2">
            <button
              onClick={() => prevFolderId && navigate(`/folder/${prevFolderId}`)}
              disabled={!prevFolderId}
              className={`p-1 rounded transition-colors ${
                prevFolderId 
                  ? 'text-gray-600 hover:bg-white hover:text-blue-600 shadow-sm border border-transparent hover:border-gray-200' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="이전 폴더"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="h-4 w-px bg-gray-300 mx-1" />
            <button
              onClick={() => nextFolderId && navigate(`/folder/${nextFolderId}`)}
              disabled={!nextFolderId}
              className={`p-1 rounded transition-colors ${
                nextFolderId 
                  ? 'text-gray-600 hover:bg-white hover:text-blue-600 shadow-sm border border-transparent hover:border-gray-200' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="다음 폴더"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
        <button
          onClick={() => setIsBookmarkModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
        >
          <Bookmark size={18} />
          북마크
        </button>
        <button
          onClick={() => navigate('/folder/add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          폴더 추가
        </button>
        <span
          className="text-sm text-gray-600 font-medium cursor-pointer hover:text-blue-600 hover:underline transition-all"
          onClick={() => navigate('/settings')}
        >
          {name}님
        </span>
        <button
          onClick={handleLogout}
          className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          로그아웃
        </button>
      </div>

      {/* Bookmark Modal */}
      {isBookmarkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsBookmarkModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Bookmark className="text-amber-500" size={20} />
                북마크 목록
              </h2>
              <button 
                onClick={() => setIsBookmarkModalOpen(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {bookmarks && bookmarks.length > 0 ? (
                <div className="space-y-1">
                  {bookmarks.map((bm) => (
                    <div 
                      key={bm.id}
                      className="group flex items-center justify-between p-3 hover:bg-amber-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-amber-100"
                      onClick={() => {
                        navigate(`/image/${bm.imageId}`);
                        setIsBookmarkModalOpen(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{bm.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {bm.folderName} / {bm.imageName}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('북마크를 삭제하시겠습니까?')) {
                            deleteBookmarkMutation.mutate(bm.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Bookmark size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">등록된 북마크가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;
