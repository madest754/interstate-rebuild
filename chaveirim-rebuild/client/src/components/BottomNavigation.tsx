import { Home, Plus, Users, Calendar, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type Page = 'dashboard' | 'new-call' | 'members' | 'schedule' | 'admin' | 'settings';

interface BottomNavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isDispatcher: boolean;
  isAdmin: boolean;
}

export function BottomNavigation({ currentPage, onNavigate, isDispatcher, isAdmin }: BottomNavigationProps) {
  const navItems = [
    { id: 'dashboard' as Page, icon: Home, label: 'Dashboard', show: true },
    { id: 'new-call' as Page, icon: Plus, label: 'New Call', show: isDispatcher },
    { id: 'members' as Page, icon: Users, label: 'Directory', show: true },
    { id: 'schedule' as Page, icon: Calendar, label: 'Schedule', show: isDispatcher },
    { id: 'admin' as Page, icon: Shield, label: 'Admin', show: isAdmin },
  ].filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-40">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || 
            (item.id === 'new-call' && currentPage === 'call-edit');
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors',
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <Icon className={cn(
                'h-5 w-5',
                item.id === 'new-call' && 'h-6 w-6'
              )} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
