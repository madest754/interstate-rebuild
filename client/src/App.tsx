import { useState, useEffect, createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

// Pages
import Dashboard from './pages/Dashboard';
import MembersPage from './pages/MembersPage';
import SchedulePage from './pages/SchedulePage';

// Components
import { BottomNavigation } from './components/BottomNavigation';
import { TopBar } from './components/TopBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/ConnectionStatus';
import { Toaster } from './components/ui/toaster';

// Hooks
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

// Guest user for read-only mode
const GUEST_USER: User = {
  id: 'guest',
  email: 'guest@chaveirim.org',
  role: 'member',
  memberId: null,
  firstName: 'Guest',
  lastName: 'User',
};

// Auth context
const AuthContext = createContext<AuthContextType>({
  user: GUEST_USER,
  isLoading: false,
  isAuthenticated: false,
  isAdmin: false,
  isDispatcher: false,
  refetch: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Simple router state - limited pages for guest mode
type Page = 'dashboard' | 'members' | 'schedule';

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

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Try to fetch user (will fail in serverless mode, that's ok)
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user', { credentials: 'include' });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Prefetch reference data
  usePrefetchReferenceData();

  // Use guest user if not authenticated
  const activeUser = user || GUEST_USER;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isDispatcher = user?.role === 'admin' || user?.role === 'dispatcher';

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

  // Render current page - limited for guest mode
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onEditCall={() => {}} onNewCall={() => {}} />;
      case 'members':
        return <MembersPage />;
      case 'schedule':
        return <SchedulePage />;
      default:
        return <Dashboard onEditCall={() => {}} onNewCall={() => {}} />;
    }
  };

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ 
        user: activeUser, 
        isLoading, 
        isAuthenticated, 
        isAdmin, 
        isDispatcher, 
        refetch: () => {} 
      }}>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          {/* Offline banner */}
          <OfflineBanner />
          
          {/* Read-only banner for guest mode */}
          {!isAuthenticated && (
            <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-center text-amber-800 text-sm">
              👁️ Read-only mode - Login disabled in serverless deployment
            </div>
          )}
          
          {/* Top bar */}
          <TopBar 
            user={activeUser} 
            currentPage={currentPage}
            onNavigate={(page) => setCurrentPage(page as Page)}
          />
          
          {/* Main content */}
          <main className="flex-1 pb-20 md:pb-4 overflow-auto">
            <ErrorBoundary>
              {renderPage()}
            </ErrorBoundary>
          </main>
          
          {/* Bottom navigation (mobile) - limited options */}
          <BottomNavigation 
            currentPage={currentPage}
            onNavigate={(page) => setCurrentPage(page as Page)}
            isDispatcher={false}
            isAdmin={false}
          />
          
          {/* Toast notifications */}
          <Toaster />
        </div>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
