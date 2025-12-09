/**
 * Drafts Hook
 * 
 * Manages call drafts with local storage sync and cloud persistence.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

export interface Draft {
  id: string;
  userId: string;
  formData: Record<string, any>;
  locationType?: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_DRAFT_KEY = 'chaveirim_local_draft';

// ============================================================================
// SERVER DRAFTS
// ============================================================================

export function useDrafts() {
  return useQuery({
    queryKey: ['drafts'],
    queryFn: async (): Promise<Draft[]> => {
      const response = await fetch('/api/drafts', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch drafts');
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}

export function useAllDrafts() {
  return useQuery({
    queryKey: ['drafts', 'all'],
    queryFn: async (): Promise<Draft[]> => {
      const response = await fetch('/api/drafts/all', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch drafts');
      return response.json();
    },
  });
}

export function useDraftMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { formData: Record<string, any>; locationType?: string }) => {
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create draft');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drafts'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Draft> }) => {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update draft');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drafts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete draft');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drafts'] }),
  });

  return {
    createDraft: createMutation.mutateAsync,
    updateDraft: updateMutation.mutateAsync,
    deleteDraft: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}

// ============================================================================
// LOCAL DRAFT (for form auto-save)
// ============================================================================

interface LocalDraft {
  formData: Record<string, any>;
  locationType: string;
  savedAt: string;
}

export function useLocalDraft() {
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if draft is less than 24 hours old
        const savedAt = new Date(parsed.savedAt);
        const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          setLocalDraft(parsed);
        } else {
          localStorage.removeItem(LOCAL_DRAFT_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to load local draft:', e);
    }
  }, []);

  const saveLocalDraft = useCallback((formData: Record<string, any>, locationType: string) => {
    const draft: LocalDraft = {
      formData,
      locationType,
      savedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
      setLocalDraft(draft);
    } catch (e) {
      console.error('Failed to save local draft:', e);
    }
  }, []);

  const clearLocalDraft = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setLocalDraft(null);
    } catch (e) {
      console.error('Failed to clear local draft:', e);
    }
  }, []);

  const hasLocalDraft = localDraft !== null;

  return {
    localDraft,
    hasLocalDraft,
    saveLocalDraft,
    clearLocalDraft,
  };
}

// ============================================================================
// COMBINED DRAFT MANAGEMENT
// ============================================================================

/**
 * Combined hook for managing both local and server drafts
 */
export function useDraftManager() {
  const { data: serverDrafts, isLoading } = useDrafts();
  const { localDraft, hasLocalDraft, saveLocalDraft, clearLocalDraft } = useLocalDraft();
  const { createDraft, updateDraft, deleteDraft, isSaving } = useDraftMutations();

  // Auto-save to server periodically
  const syncToServer = useCallback(async () => {
    if (!localDraft) return;

    try {
      await createDraft({
        formData: localDraft.formData,
        locationType: localDraft.locationType,
      });
      clearLocalDraft();
    } catch (e) {
      console.error('Failed to sync draft to server:', e);
    }
  }, [localDraft, createDraft, clearLocalDraft]);

  return {
    serverDrafts: serverDrafts || [],
    localDraft,
    hasLocalDraft,
    isLoading,
    isSaving,
    saveLocalDraft,
    clearLocalDraft,
    syncToServer,
    createDraft,
    updateDraft,
    deleteDraft,
  };
}
