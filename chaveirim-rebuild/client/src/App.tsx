import { useState, useEffect, createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CallForm from './pages/CallForm';
import MembersPage from './pages/MembersPage';
import SchedulePage from './pages/SchedulePage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';

// Components
import { BottomNavigation } from './components/BottomNavigation';
import { TopBar } from './components/TopBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/ConnectionStatus';
import { Toaster } from './components/ui/toaster';
import { ToastProvider } from './hooks/useToast';

// Hooks
import { useWebSocket } from './hooks/useWebSocket';
import { usePrefetchReferenceData } from './hooks/useReferenceData';

// Types
interface User {
  id: string;
  email: string;
  role: string;
  memberId: string | null;
  unitNumber?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDispatcher: boolean;
  refetch: () => void;
}

// Auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  isDispatcher: false,
  refetch: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Simple router state
type Page = 'dashboard' | 'new-call' | 'members' | 'schedule' | 'admin' | 'settings' | 'call-edit';

// Register service worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    });
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [editCallId, setEditCallId] = useState<string | null>(null);

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Fetch current user
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/user', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Prefetch reference data when user is authenticated
  usePrefetchReferenceData();

  // Connect to WebSocket when authenticated
  useWebSocket({ enabled: !!user });

  // Compute auth values
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isDispatcher = user?.role === 'admin' || user?.role === 'dispatcher';

  // Navigate to call edit
  const handleEditCall = (callId: string) => {
    setEditCallId(callId);
    setCurrentPage('call-edit');
  };

  // Navigate back to dashboard
  const handleBack = () => {
    setEditCallId(null);
    setCurrentPage('dashboard');
  };

  // Navigate to new call
  const handleNewCall = () => {
    setEditCallId(null);
    setCurrentPage('new-call');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return (
      <ErrorBoundary>
        <ToastProvider>
          <LoginPage onSuccess={refetch} />
          <Toaster />
        </ToastProvider>
      </ErrorBoundary>
    );
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onEditCall={handleEditCall} onNewCall={handleNewCall} />;
      case 'new-call':
        return isDispatcher ? <CallForm onBack={handleBack} /> : <Dashboard onEditCall={handleEditCall} onNewCall={handleNewCall} />;
      case 'call-edit':
        return isDispatcher && editCallId ? <CallForm callId={editCallId} onBack={handleBack} /> : <Dashboard onEditCall={handleEditCall} onNewCall={handleNewCall} />;
      case 'members':
        return <MembersPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'admin':
        return isAdmin ? <AdminPage /> : <Dashboard onEditCall={handleEditCall} onNewCall={handleNewCall} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onEditCall={handleEditCall} onNewCall={handleNewCall} />;
    }
  };

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, isLoading, isAuthenticated, isAdmin, isDispatcher, refetch }}>
        <ToastProvider>
          <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Offline banner */}
            <OfflineBanner />
            
            {/* Top bar */}
            <TopBar 
              user={user} 
              currentPage={currentPage}
              onNavigate={setCurrentPage}
            />
            
            {/* Main content */}
            <main className="flex-1 pb-20 md:pb-4 overflow-auto">
              <ErrorBoundary>
                {renderPage()}
              </ErrorBoundary>
            </main>
            
            {/* Bottom navigation (mobile) */}
            <BottomNavigation 
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              isDispatcher={isDispatcher}
              isAdmin={isAdmin}
            />
            
            {/* Toast notifications */}
            <Toaster />
          </div>
        </ToastProvider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
