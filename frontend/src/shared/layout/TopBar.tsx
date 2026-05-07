import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2 } from 'lucide-react';

const TopBar = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { name, clearAuth } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: subfolders, isLoading: isLoadingSubfolders } = useQuery<string[]>({
    queryKey: ['subfolders'],
    queryFn: async () => {
      const res = await apiClient.get('/folders/subfolders');
      return res.data;
    },
    enabled: isModalOpen,
  });

  const addFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      await apiClient.post('/folders', { folderName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setIsModalOpen(false);
    },
  });

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
    <>
      <div className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 
            className="text-xl font-bold text-blue-600 cursor-pointer"
            onClick={() => navigate('/')}
          >
            SOFIA
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Add New Folder
          </button>
        </div>
        <div className="flex items-center gap-4">
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">새 폴더 추가</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {isLoadingSubfolders ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="animate-spin text-blue-600 mb-2" />
                  <p className="text-sm text-gray-500">폴더 목록을 불러오는 중...</p>
                </div>
              ) : subfolders && subfolders.length > 0 ? (
                <div className="space-y-2">
                  {subfolders.map((folder) => (
                    <button
                      key={folder}
                      onClick={() => addFolderMutation.mutate(folder)}
                      disabled={addFolderMutation.isPending}
                      className="w-full text-left p-3 hover:bg-blue-50 rounded-lg border border-gray-100 transition-colors flex justify-between items-center group"
                    >
                      <span className="text-gray-700 font-medium">{folder}</span>
                      {addFolderMutation.isPending && addFolderMutation.variables === folder ? (
                        <Loader2 className="animate-spin text-blue-600 h-4 w-4" />
                      ) : (
                        <Plus className="text-gray-300 group-hover:text-blue-600 h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  사용 가능한 하위 폴더가 없습니다.
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
