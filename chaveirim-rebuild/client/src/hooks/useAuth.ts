/**
 * Authentication Hook
 * 
 * Manages authentication state and provides login/logout functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'dispatcher' | 'member';
  memberId: string | null;
  unitNumber?: string;
  firstName?: string;
  lastName?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

async function fetchUser(): Promise<User | null> {
  const response = await fetch('/api/user', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error('Failed to fetch user');
  }
  
  return response.json();
}

async function login(credentials: LoginCredentials): Promise<User> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }
  
  return response.json();
}

async function logout(): Promise<void> {
  const response = await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isDispatcher: user?.role === 'admin' || user?.role === 'dispatcher',
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
  };
}

export function useUser() {
  const { user, isLoading, isAuthenticated } = useAuth();
  return { user, isLoading, isAuthenticated };
}
