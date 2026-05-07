import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from '@/domain/user/LoginPage';
import TopBar from '@/shared/layout/TopBar';
import { useAuthStore } from '@/store/authStore';
import FolderListPage from '@/domain/folder/FolderListPage';
import ImageListPage from '@/domain/folder/ImageListPage';
import ImageViewPage from '@/domain/folder/ImageViewPage';
import SettingsPage from '@/domain/user/SettingsPage';

const ProtectedLayout = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<FolderListPage />} />
          <Route path="/folder/:folderId" element={<ImageListPage />} />
          <Route path="/image/:imageId" element={<ImageViewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
