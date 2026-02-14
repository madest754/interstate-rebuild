import { useState, useEffect, createContext, useContext } from 'react';
import { Loader2 } from 'lucide-react';

// Pages
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
  user: User;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDispatcher: boolean;
  refetch: () => void;
}

// Default dispatcher user - full access, no login needed
const DEFAULT_USER: User = {
  id: 'default-user',
  email: 'dispatcher@chaveirim.org',
  role: 'dispatcher',
  memberId: null,
  firstName: 'Dispatcher',
  lastName: '',
  unitNumber: '000',
};

// Auth context
const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_USER,
  isLoading: false,
  isAuthenticated: true,
  isAdmin: true,
  isDispatcher: true,
  refetch: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Simple router state
type Page = 'dashboard' | 'new-call' | 'call-edit' | 'members' | 'schedule' | 'admin' | 'settings';

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
  const [isReady, setIsReady] = useState(false);

  // Register service worker and mark ready
  useEffect(() => {
    registerServiceWorker();
    // Small delay to ensure styles load
    setTimeout(() => setIsReady(true), 100);
  }, []);

  // Prefetch reference data
  usePrefetchReferenceData();

  // Navigation handlers
  const handleNewCall = () => {
    setEditCallId(null);
    setCurrentPage('new-call');
  };

  const handleEditCall = (callId: string) => {
    setEditCallId(callId);
    setCurrentPage('call-edit');
  };

  const handleBack = () => {
    setEditCallId(null);
    setCurrentPage('dashboard');
  };

  // Show brief loading
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading Dispatcher...</p>
        </div>
      </div>
    );
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onEditCall={handleEditCall} onNewCall={handleNewCall} />;
      case 'new-call':
        return <CallForm onBack={handleBack} />;
      case 'call-edit':
        return editCallId ? <CallForm callId={editCallId} onBack={handleBack} /> : <Dashboard onEditCall={handleEditCall} onNewCall={handleNewCall} />;
      case 'members':
        return <MembersPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'admin':
        return <AdminPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onEditCall={handleEditCall} onNewCall={handleNewCall} />;
    }
  };

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ 
        user: DEFAULT_USER, 
        isLoading: false, 
        isAuthenticated: true, 
        isAdmin: true, 
        isDispatcher: true, 
        refetch: () => {} 
      }}>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          {/* Offline banner */}
          <OfflineBanner />
          
          {/* Top bar */}
          <TopBar 
            user={DEFAULT_USER} 
            currentPage={currentPage}
            onNavigate={(page) => setCurrentPage(page as Page)}
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
            onNavigate={(page) => setCurrentPage(page as Page)}
            isDispatcher={true}
            isAdmin={true}
          />
          
          {/* Toast notifications */}
          <Toaster />
        </div>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
