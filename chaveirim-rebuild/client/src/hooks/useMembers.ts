/**
 * Members Hook
 * 
 * Manages member data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Member {
  id: string;
  unitNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  secondaryPhone?: string;
  whatsappId?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  zones: string[];
  skills: string[];
  isActive: boolean;
  isDispatcher: boolean;
  isCoordinator: boolean;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
  appOptIn: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

async function fetchMembers(includeAll: boolean = false): Promise<Member[]> {
  const url = includeAll ? '/api/members?includeAll=true' : '/api/members';
  const response = await fetch(url, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch members');
  }
  
  return response.json();
}

async function fetchMember(id: string): Promise<Member> {
  const response = await fetch(`/api/members/${id}`, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch member');
  }
  
  return response.json();
}

async function fetchCurrentMember(): Promise<Member> {
  const response = await fetch('/api/members/me', { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch current member');
  }
  
  return response.json();
}

async function searchMembers(query: string): Promise<Member[]> {
  const response = await fetch(`/api/search-directory?q=${encodeURIComponent(query)}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Search failed');
  }
  
  return response.json();
}

async function createMember(data: Partial<Member>): Promise<Member> {
  const response = await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create member');
  }
  
  return response.json();
}

async function updateMember({ id, data }: { id: string; data: Partial<Member> }): Promise<Member> {
  const response = await fetch(`/api/members/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update member');
  }
  
  return response.json();
}

async function deleteMember(id: string): Promise<void> {
  const response = await fetch(`/api/members/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete member');
  }
}

/**
 * Hook for fetching all members
 */
export function useMembers(includeAll: boolean = false) {
  return useQuery({
    queryKey: ['members', includeAll],
    queryFn: () => fetchMembers(includeAll),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single member
 */
export function useMember(id: string) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => fetchMember(id),
    enabled: !!id,
  });
}

/**
 * Hook for current user's member profile
 */
export function useCurrentMember() {
  return useQuery({
    queryKey: ['member', 'me'],
    queryFn: fetchCurrentMember,
  });
}

/**
 * Hook for searching members
 */
export function useMemberSearch(query: string) {
  return useQuery({
    queryKey: ['members', 'search', query],
    queryFn: () => searchMembers(query),
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

/**
 * Hook for dispatchers
 */
export function useDispatchers() {
  return useQuery({
    queryKey: ['dispatchers'],
    queryFn: async () => {
      const response = await fetch('/api/dispatchers', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for coordinators
 */
export function useCoordinators() {
  return useQuery({
    queryKey: ['coordinators'],
    queryFn: async () => {
      const response = await fetch('/api/coordinators', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for member mutations
 */
export function useMemberMutations() {
  const queryClient = useQueryClient();

  const invalidateMembers = () => {
    queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: invalidateMembers,
  });

  const updateMutation = useMutation({
    mutationFn: updateMember,
    onSuccess: (data) => {
      queryClient.setQueryData(['member', data.id], data);
      invalidateMembers();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: invalidateMembers,
  });

  return {
    createMember: createMutation.mutateAsync,
    updateMember: updateMutation.mutateAsync,
    deleteMember: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
