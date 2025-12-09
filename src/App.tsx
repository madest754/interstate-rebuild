import { useState } from 'react';
import { Home, Plus, Users, Shield, Phone, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Pages
import Dashboard from './pages/Dashboard';
import CallForm from './pages/CallForm';
import MembersPage from './pages/MembersPage';
import AdminPage from './pages/AdminPage';

type Page = 'dashboard' | 'new-call' | 'edit-call' | 'members' | 'admin';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [editCallId, setEditCallId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleNewCall = () => {
    setEditCallId(null);
    setCurrentPage('new-call');
  };

  const handleEditCall = (callId: string) => {
    setEditCallId(callId);
    setCurrentPage('edit-call');
  };

  const handleBack = () => {
    setEditCallId(null);
    setCurrentPage('dashboard');
  };

  const navigate = (page: Page) => {
    setCurrentPage(page);
    setShowMobileMenu(false);
  };

  const navItems = [
    { id: 'dashboard' as Page, icon: Home, label: 'Dashboard' },
    { id: 'new-call' as Page, icon: Plus, label: 'New Call' },
    { id: 'members' as Page, icon: Users, label: 'Directory' },
    { id: 'admin' as Page, icon: Shield, label: 'Admin' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNewCall={handleNewCall} onEditCall={handleEditCall} />;
      case 'new-call':
        return <CallForm onBack={handleBack} />;
      case 'edit-call':
        return editCallId ? <CallForm callId={editCallId} onBack={handleBack} /> : <Dashboard onNewCall={handleNewCall} onEditCall={handleEditCall} />;
      case 'members':
        return <MembersPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <Dashboard onNewCall={handleNewCall} onEditCall={handleEditCall} />;
    }
  };

  const pageTitle = {
    dashboard: 'Active Calls',
    'new-call': 'New Call',
    'edit-call': 'Edit Call',
    members: 'Directory',
    admin: 'Admin',
  }[currentPage];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-blue-600 text-white shadow-md">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden p-2 -ml-2 hover:bg-blue-500 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            <span className="font-semibold text-lg hidden sm:inline">Chaveirim Dispatcher</span>
          </div>

          {/* Page title (mobile) */}
          <h1 className="text-lg font-medium md:hidden">{pageTitle}</h1>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || 
                (item.id === 'new-call' && currentPage === 'edit-call');
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                    isActive ? 'bg-blue-500' : 'hover:bg-blue-500/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Spacer for mobile */}
          <div className="w-8 md:hidden" />
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Chaveirim</span>
              </div>
              <button onClick={() => setShowMobileMenu(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors',
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-4 overflow-auto">
        {renderPage()}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || 
              (item.id === 'new-call' && currentPage === 'edit-call');
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors',
                  isActive 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon className={cn('h-5 w-5', item.id === 'new-call' && 'h-6 w-6')} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
