import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import axios from 'axios';

const TopBar = () => {
  const navigate = useNavigate();
  const { name, clearAuth } = useAuthStore();

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await axios.get('/sofia/health');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
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
        <button
          onClick={() => navigate('/folder/add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Add New Folder
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
    </div>
  );
};

export default TopBar;
