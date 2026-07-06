import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IncidentList from './pages/IncidentList';
import IncidentDetail from './pages/IncidentDetail';
import UserList from './pages/UserList';
import LandingPage from './pages/LandingPage';
import TrailSafety from './pages/TrailSafety';
import OperatorManifests from './pages/operator/OperatorManifests';

import FamilyView from './pages/FamilyView';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import OperatorGroups from './pages/operator/OperatorGroups';
import OperatorAnalytics from './pages/operator/OperatorAnalytics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/home', element: <LandingPage /> },
  { path: '/login', element: <Login /> },
  { path: '/family/:shareToken', element: <FamilyView /> }, // Public family route
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'incidents', element: <IncidentList /> },
      { path: 'incidents/:id', element: <IncidentDetail /> },
      { path: 'trails', element: <TrailSafety /> },
      { path: 'users', element: <UserList /> },
      
      // Operator Routes
      { path: 'operator', element: <OperatorDashboard /> },
      { path: 'operator/groups', element: <OperatorGroups /> },
      { path: 'operator/manifests', element: <OperatorManifests /> },
      { path: 'operator/analytics', element: <OperatorAnalytics /> },
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
