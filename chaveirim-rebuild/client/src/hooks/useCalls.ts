/**
 * Calls Hook
 * 
 * Manages calls data fetching, creation, updates, and real-time sync.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';

export interface Call {
  id: string;
  callNumber: number;
  status: 'active' | 'closed' | 'abandoned';
  
  // Requester info
  requestedBy1?: string;
  requestedBy2?: string;
  requestedBy3?: string;
  requestedBy4?: string;
  nature?: string;
  
  // Caller info
  callerName?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  phone4?: string;
  
  // Address location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Highway location
  highwayId?: string;
  customHighway?: string;
  direction?: string;
  localExpress?: string;
  betweenExit?: string;
  andExit?: string;
  mileMarker?: string;
  
  // Free text location
  freeTextLocation?: string;
  
  // Coordinates
  mapLink?: string;
  latitude?: string;
  longitude?: string;
  territory?: string;
  
  // Vehicle info
  carMakeId?: string;
  carModelId?: string;
  carColor?: string;
  customVehicle?: string;
  vehicleComment?: string;
  
  // Notes
  dispatcherMessage?: string;
  internalNotes?: InternalNote[];
  
  // Flags
  urgent: boolean;
  
  // Assignments
  assignments?: CallAssignment[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface InternalNote {
  note: string;
  timestamp: string;
  author: string;
}

export interface CallAssignment {
  id: string;
  callId: string;
  memberId: string;
  eta?: number;
  status: 'assigned' | 'enroute' | 'onscene' | 'completed';
  assignedAt: string;
  arrivedAt?: string;
  completedAt?: string;
  member?: {
    id: string;
    unitNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

interface CreateCallData {
  [key: string]: any;
}

interface UpdateCallData {
  id: string;
  data: Partial<Call>;
}

async function fetchCalls(status?: string): Promise<Call[]> {
  const url = status ? `/api/calls?status=${status}` : '/api/calls';
  const response = await fetch(url, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch calls');
  }
  
  return response.json();
}

async function fetchCall(id: string): Promise<Call> {
  const response = await fetch(`/api/calls/${id}`, { credentials: 'include' });
  
  if (!response.ok) {
    throw new Error('Failed to fetch call');
  }
  
  return response.json();
}

async function createCall(data: CreateCallData): Promise<Call> {
  const response = await fetch('/api/calls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create call');
  }
  
  return response.json();
}

async function updateCall({ id, data }: UpdateCallData): Promise<Call> {
  const response = await fetch(`/api/calls/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update call');
  }
  
  return response.json();
}

async function closeCall(id: string): Promise<Call> {
  const response = await fetch(`/api/calls/${id}/close`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to close call');
  }
  
  return response.json();
}

async function reopenCall(id: string): Promise<Call> {
  const response = await fetch(`/api/calls/${id}/reopen`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to reopen call');
  }
  
  return response.json();
}

async function assignMember(callId: string, memberId: string, eta?: number): Promise<CallAssignment> {
  const response = await fetch(`/api/calls/${callId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ memberId, eta }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to assign member');
  }
  
  return response.json();
}

async function removeAssignment(callId: string, assignmentId: string): Promise<void> {
  const response = await fetch(`/api/calls/${callId}/assign/${assignmentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to remove assignment');
  }
}

async function broadcastCall(callId: string, message: string): Promise<void> {
  const response = await fetch(`/api/calls/${callId}/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to broadcast');
  }
}

/**
 * Hook for fetching all calls
 */
export function useCalls(status?: string) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['calls', status],
    queryFn: () => fetchCalls(status),
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Prefetch active calls
  useEffect(() => {
    if (!status) {
      queryClient.prefetchQuery({
        queryKey: ['calls', 'active'],
        queryFn: () => fetchCalls('active'),
      });
    }
  }, [queryClient, status]);

  return query;
}

/**
 * Hook for fetching active calls only
 */
export function useActiveCalls() {
  return useCalls('active');
}

/**
 * Hook for fetching a single call
 */
export function useCall(id: string) {
  return useQuery({
    queryKey: ['call', id],
    queryFn: () => fetchCall(id),
    enabled: !!id,
  });
}

/**
 * Hook for call mutations (create, update, close, etc.)
 */
export function useCallMutations() {
  const queryClient = useQueryClient();

  const invalidateCalls = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calls'] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: createCall,
    onSuccess: invalidateCalls,
  });

  const updateMutation = useMutation({
    mutationFn: updateCall,
    onSuccess: (data) => {
      queryClient.setQueryData(['call', data.id], data);
      invalidateCalls();
    },
  });

  const closeMutation = useMutation({
    mutationFn: closeCall,
    onSuccess: invalidateCalls,
  });

  const reopenMutation = useMutation({
    mutationFn: reopenCall,
    onSuccess: invalidateCalls,
  });

  const assignMutation = useMutation({
    mutationFn: ({ callId, memberId, eta }: { callId: string; memberId: string; eta?: number }) =>
      assignMember(callId, memberId, eta),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: ['call', callId] });
      invalidateCalls();
    },
  });

  const unassignMutation = useMutation({
    mutationFn: ({ callId, assignmentId }: { callId: string; assignmentId: string }) =>
      removeAssignment(callId, assignmentId),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: ['call', callId] });
      invalidateCalls();
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: ({ callId, message }: { callId: string; message: string }) =>
      broadcastCall(callId, message),
  });

  return {
    createCall: createMutation.mutateAsync,
    updateCall: updateMutation.mutateAsync,
    closeCall: closeMutation.mutateAsync,
    reopenCall: reopenMutation.mutateAsync,
    assignMember: assignMutation.mutateAsync,
    unassignMember: unassignMutation.mutateAsync,
    broadcastCall: broadcastMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isClosing: closeMutation.isPending,
  };
}

/**
 * Hook for recently completed calls
 */
export function useRecentlyCompletedCalls(minutes: number = 15) {
  return useQuery({
    queryKey: ['calls', 'recent-completed', minutes],
    queryFn: async () => {
      const response = await fetch(`/api/recent-completed?minutes=${minutes}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    refetchInterval: 30000,
  });
}
