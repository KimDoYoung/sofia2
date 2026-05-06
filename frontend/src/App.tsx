import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from '@/domain/user/LoginPage';
import TopBar from '@/shared/layout/TopBar';
import { useAuthStore } from '@/store/authStore';

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

const Dashboard = () => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <p className="text-gray-600">Welcome to SOFIA!</p>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          {/* Add more protected routes here */}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
