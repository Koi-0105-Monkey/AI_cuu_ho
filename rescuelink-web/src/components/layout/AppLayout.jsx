import { useState, createContext, useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export const LayoutContext = createContext({
  isMobileSidebarOpen: false,
  toggleMobileSidebar: () => {},
  closeMobileSidebar: () => {},
});

export const useLayout = () => useContext(LayoutContext);

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(prev => !prev);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-muted text-sm animate-pulse">Đang kết nối hệ thống RescueLink...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <LayoutContext.Provider value={{ isMobileSidebarOpen, toggleMobileSidebar, closeMobileSidebar }}>
      <div className="flex min-h-screen bg-surface text-slate-100 relative overflow-x-hidden">
        <Sidebar isOpen={isMobileSidebarOpen} onClose={closeMobileSidebar} />
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </LayoutContext.Provider>
  );
}
