import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';

const TopBar = () => {
  const navigate = useNavigate();
  const { name, clearAuth } = useAuthStore();

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
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-blue-600">SOFIA</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 font-medium">{name}님</span>
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
