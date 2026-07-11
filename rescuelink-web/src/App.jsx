import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import IncidentList from './pages/IncidentList';
import IncidentDetail from './pages/IncidentDetail';
import UserList from './pages/UserList';
import LandingPage from './pages/LandingPage';
import TrailSafety from './pages/TrailSafety';
import UserPortal from './pages/UserPortal';
import FamilyView from './pages/FamilyView';

// Lazy-load heavy pages with Leaflet + Recharts to reduce initial bundle
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const HQAnalytics = lazy(() => import('./pages/HQAnalytics'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60 * 1_000, // 5 min — evict unused cache to free memory
    },
  },
});

// Minimal fallback while lazy chunks load
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted text-sm min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emergency-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Đang tải...</span>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/trails', element: <TrailSafety /> },
  { path: '/portal', element: <UserPortal /> },
  { path: '/login', element: <Login /> },
  { path: '/family/:shareToken', element: <FamilyView /> }, // Public family route
  {
    element: <AppLayout />,
    children: [
      { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><Dashboard /></Suspense> },
      { path: 'incidents', element: <IncidentList /> },
      { path: 'incidents/:id', element: <IncidentDetail /> },
      { path: 'dashboard/analytics', element: <Suspense fallback={<PageLoader />}><HQAnalytics /></Suspense> },
      { path: 'dashboard/trails', element: <TrailSafety /> },
      { path: 'dashboard/portal', element: <UserPortal /> },
      { path: 'users', element: <UserList /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1c2028',
              color: '#fff',
              border: '1px solid #2a2f3d',
              fontSize: '0.875rem',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
