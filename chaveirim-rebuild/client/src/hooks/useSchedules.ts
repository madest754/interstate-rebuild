/**
 * Schedules Hook
 * 
 * Manages dispatcher schedules and shift overrides.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Schedule {
  id: string;
  memberId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string;
  queue: 'primary' | 'secondary' | 'third';
  autoPullLine: boolean;
  isActive: boolean;
  member?: {
    id: string;
    unitNumber: string;
    firstName: string;
    lastName: string;
  };
}

export interface ShiftOverride {
  id: string;
  date: string; // YYYY-MM-DD
  scheduleId?: string;
  originalMemberId?: string;
  replacementMemberId?: string;
  reason?: string;
  createdBy?: string;
  createdAt: string;
}

export interface QueueSession {
  id: string;
  memberId: string;
  queue: string;
  phoneNumber?: string;
  source: 'manual' | 'auto' | 'override';
  loginTime: string;
  logoutTime?: string;
  isActive: boolean;
  member?: {
    id: string;
    unitNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

// ============================================================================
// SCHEDULES
// ============================================================================

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async (): Promise<Schedule[]> => {
      const response = await fetch('/api/schedules', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useScheduleMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Schedule>) => {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Schedule> }) => {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });

  return {
    createSchedule: createMutation.mutateAsync,
    updateSchedule: updateMutation.mutateAsync,
    deleteSchedule: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// ============================================================================
// SHIFT OVERRIDES
// ============================================================================

export function useShiftOverrides() {
  return useQuery({
    queryKey: ['shift-overrides'],
    queryFn: async (): Promise<ShiftOverride[]> => {
      const response = await fetch('/api/shift-overrides', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch overrides');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyShiftOverrides() {
  return useQuery({
    queryKey: ['shift-overrides', 'mine'],
    queryFn: async (): Promise<ShiftOverride[]> => {
      const response = await fetch('/api/my-shift-overrides', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch overrides');
      return response.json();
    },
  });
}

export function useShiftOverrideMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ShiftOverride>) => {
      const response = await fetch('/api/shift-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-overrides'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/shift-overrides/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-overrides'] }),
  });

  return {
    createOverride: createMutation.mutateAsync,
    deleteOverride: deleteMutation.mutateAsync,
  };
}

// ============================================================================
// QUEUE SESSIONS
// ============================================================================

export function useQueueSessions() {
  return useQuery({
    queryKey: ['queue-sessions'],
    queryFn: async (): Promise<QueueSession[]> => {
      const response = await fetch('/api/queue-sessions/active', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useQueueMembers() {
  return useQuery({
    queryKey: ['queue-members'],
    queryFn: async () => {
      const response = await fetch('/api/phone-system/queue-members', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch queue members');
      return response.json();
    },
    refetchInterval: 30000,
  });
}

export function useDispatcherStatus() {
  return useQuery({
    queryKey: ['dispatcher-status'],
    queryFn: async () => {
      const response = await fetch('/api/dispatcher-status', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useQueueMutations() {
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async ({ memberId, queue, phoneNumbers }: { memberId: string; queue: string; phoneNumbers?: string[] }) => {
      const response = await fetch('/api/phone-system/queue-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId, queue, phoneNumbers }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to login');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['queue-members'] });
      queryClient.invalidateQueries({ queryKey: ['dispatcher-status'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async ({ memberId, queue }: { memberId: string; queue?: string }) => {
      const response = await fetch('/api/phone-system/queue-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId, queue }),
      });
      if (!response.ok) throw new Error('Failed to logout');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['queue-members'] });
      queryClient.invalidateQueries({ queryKey: ['dispatcher-status'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/queue-sessions/clear', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to clear');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['queue-members'] });
    },
  });

  return {
    queueLogin: loginMutation.mutateAsync,
    queueLogout: logoutMutation.mutateAsync,
    clearAllQueues: clearAllMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || '';
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function getCurrentSchedule(schedules: Schedule[]): Schedule | undefined {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  return schedules.find(s => 
    s.isActive && 
    s.dayOfWeek === dayOfWeek && 
    s.startTime <= currentTime && 
    s.endTime > currentTime
  );
}
