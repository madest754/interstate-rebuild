import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Menu, 
  LogOut, 
  User, 
  Bell, 
  Settings, 
  Home, 
  Plus, 
  Users, 
  Calendar, 
  Shield,
  X,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

type Page = 'dashboard' | 'new-call' | 'members' | 'schedule' | 'admin' | 'settings';

interface User {
  id: string;
  email: string;
  role: string;
  unitNumber?: string;
  firstName?: string;
  lastName?: string;
}

interface TopBarProps {
  user: User;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function TopBar({ user, currentPage, onNavigate }: TopBarProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Logout failed');
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.invalidateQueries();
    },
  });

  const isDispatcher = user.role === 'admin' || user.role === 'dispatcher';
  const isAdmin = user.role === 'admin';

  const navItems = [
    { id: 'dashboard' as Page, icon: Home, label: 'Dashboard', show: true },
    { id: 'new-call' as Page, icon: Plus, label: 'New Call', show: isDispatcher },
    { id: 'members' as Page, icon: Users, label: 'Directory', show: true },
    { id: 'schedule' as Page, icon: Calendar, label: 'Schedule', show: isDispatcher },
    { id: 'admin' as Page, icon: Shield, label: 'Admin', show: isAdmin },
    { id: 'settings' as Page, icon: Settings, label: 'Settings', show: true },
  ].filter(item => item.show);

  const pageTitle = {
    dashboard: 'Active Calls',
    'new-call': 'New Call',
    'call-edit': 'Edit Call',
    members: 'Directory',
    schedule: 'Schedule',
    admin: 'Admin',
    settings: 'Settings',
  }[currentPage] || 'Chaveirim';

  return (
    <>
      <header className="sticky top-0 z-40 bg-blue-700 text-white shadow-md">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left - Logo/Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden p-2 -ml-2 hover:bg-blue-600 rounded-lg"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <span className="font-semibold text-lg hidden sm:inline">Chaveirim</span>
            </div>
          </div>

          {/* Center - Page title (mobile) */}
          <h1 className="text-lg font-medium md:hidden">{pageTitle}</h1>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right - User menu */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-blue-600 rounded-lg relative">
              <Bell className="h-5 w-5" />
              {/* Notification badge */}
              {/* <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" /> */}
            </button>
            
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-blue-600">
              <div className="text-right">
                <p className="text-sm font-medium">
                  {user.firstName || user.email.split('@')[0]}
                </p>
                <p className="text-xs text-blue-200">
                  {user.unitNumber || user.role}
                </p>
              </div>
              
              <button
                onClick={() => logoutMutation.mutate()}
                className="p-2 hover:bg-blue-600 rounded-lg"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Menu panel */}
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-lg">Chaveirim</span>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* User info */}
            <div className="p-4 border-b bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {user.unitNumber || user.role}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Nav items */}
            <nav className="p-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setShowMobileMenu(false);
                    }}
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
            
            {/* Logout */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
