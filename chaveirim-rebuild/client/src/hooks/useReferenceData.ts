/**
 * Reference Data Hooks
 * 
 * Hooks for fetching static/semi-static reference data:
 * - Highways & Exits
 * - Car Makes & Models  
 * - Agencies
 * - Problem Codes
 * - Important Phones
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// TYPES
// ============================================================================

export interface Highway {
  id: string;
  name: string;
  abbreviation?: string;
  alternativeNames: string[];
  displayOrder: number;
  isActive: boolean;
}

export interface HighwayExit {
  id: string;
  highwayId: string;
  exitNumber: string;
  exitName?: string;
  latitude?: string;
  longitude?: string;
  direction?: string;
}

export interface CarMake {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CarModel {
  id: string;
  makeId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface Agency {
  id: string;
  name: string;
  code?: string;
  initials?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProblemCode {
  id: string;
  name: string;
  code?: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface PhoneCategory {
  id: string;
  name: string;
  displayOrder: number;
}

export interface ImportantPhone {
  id: string;
  categoryId?: string;
  name: string;
  phoneNumber: string;
  notes?: string;
  displayOrder: number;
  isActive: boolean;
}

// ============================================================================
// HIGHWAYS
// ============================================================================

export function useHighways() {
  return useQuery({
    queryKey: ['highways'],
    queryFn: async (): Promise<Highway[]> => {
      const response = await fetch('/api/highways');
      if (!response.ok) throw new Error('Failed to fetch highways');
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - highways rarely change
  });
}

export function useHighwayExits(highwayId: string | undefined) {
  return useQuery({
    queryKey: ['highway-exits', highwayId],
    queryFn: async (): Promise<HighwayExit[]> => {
      const response = await fetch(`/api/highway-exits?highwayId=${highwayId}`);
      if (!response.ok) throw new Error('Failed to fetch exits');
      return response.json();
    },
    enabled: !!highwayId,
    staleTime: 30 * 60 * 1000,
  });
}

export function useHighwayMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Highway>) => {
      const response = await fetch('/api/highways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['highways'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Highway> }) => {
      const response = await fetch(`/api/highways/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['highways'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/highways/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['highways'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const response = await fetch('/api/highways/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderedIds }),
      });
      if (!response.ok) throw new Error('Failed to reorder');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['highways'] }),
  });

  return {
    createHighway: createMutation.mutateAsync,
    updateHighway: updateMutation.mutateAsync,
    deleteHighway: deleteMutation.mutateAsync,
    reorderHighways: reorderMutation.mutateAsync,
  };
}

// ============================================================================
// VEHICLES
// ============================================================================

export function useCarMakes() {
  return useQuery({
    queryKey: ['car-makes'],
    queryFn: async (): Promise<CarMake[]> => {
      const response = await fetch('/api/car-makes');
      if (!response.ok) throw new Error('Failed to fetch car makes');
      return response.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useCarModels(makeId: string | undefined) {
  return useQuery({
    queryKey: ['car-models', makeId],
    queryFn: async (): Promise<CarModel[]> => {
      const url = makeId ? `/api/car-models?makeId=${makeId}` : '/api/car-models';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch car models');
      return response.json();
    },
    enabled: !!makeId,
    staleTime: 30 * 60 * 1000,
  });
}

export function useVehicleMutations() {
  const queryClient = useQueryClient();

  const createMakeMutation = useMutation({
    mutationFn: async (data: Partial<CarMake>) => {
      const response = await fetch('/api/car-makes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['car-makes'] }),
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: Partial<CarModel>) => {
      const response = await fetch('/api/car-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['car-models', variables.makeId] });
    },
  });

  const fuzzyMatchMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch('/api/fuzzy-match-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Failed to match');
      return response.json();
    },
  });

  return {
    createMake: createMakeMutation.mutateAsync,
    createModel: createModelMutation.mutateAsync,
    fuzzyMatchVehicle: fuzzyMatchMutation.mutateAsync,
  };
}

// ============================================================================
// AGENCIES
// ============================================================================

export function useAgencies() {
  return useQuery({
    queryKey: ['agencies'],
    queryFn: async (): Promise<Agency[]> => {
      const response = await fetch('/api/agencies');
      if (!response.ok) throw new Error('Failed to fetch agencies');
      return response.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useAgencyMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Agency>) => {
      const response = await fetch('/api/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agencies'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Agency> }) => {
      const response = await fetch(`/api/agencies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agencies'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agencies/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agencies'] }),
  });

  return {
    createAgency: createMutation.mutateAsync,
    updateAgency: updateMutation.mutateAsync,
    deleteAgency: deleteMutation.mutateAsync,
  };
}

// ============================================================================
// PROBLEM CODES
// ============================================================================

export function useProblemCodes() {
  return useQuery({
    queryKey: ['problem-codes'],
    queryFn: async (): Promise<ProblemCode[]> => {
      const response = await fetch('/api/problem-codes');
      if (!response.ok) throw new Error('Failed to fetch problem codes');
      return response.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useProblemCodeMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ProblemCode>) => {
      const response = await fetch('/api/problem-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['problem-codes'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProblemCode> }) => {
      const response = await fetch(`/api/problem-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['problem-codes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/problem-codes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['problem-codes'] }),
  });

  return {
    createProblemCode: createMutation.mutateAsync,
    updateProblemCode: updateMutation.mutateAsync,
    deleteProblemCode: deleteMutation.mutateAsync,
  };
}

// ============================================================================
// IMPORTANT PHONES
// ============================================================================

export function useImportantPhones() {
  return useQuery({
    queryKey: ['important-phones'],
    queryFn: async (): Promise<ImportantPhone[]> => {
      const response = await fetch('/api/important-phones');
      if (!response.ok) throw new Error('Failed to fetch phones');
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function usePhoneCategories() {
  return useQuery({
    queryKey: ['phone-categories'],
    queryFn: async (): Promise<PhoneCategory[]> => {
      const response = await fetch('/api/phone-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useImportantPhoneMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ImportantPhone>) => {
      const response = await fetch('/api/important-phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['important-phones'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImportantPhone> }) => {
      const response = await fetch(`/api/important-phones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['important-phones'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/important-phones/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['important-phones'] }),
  });

  return {
    createPhone: createMutation.mutateAsync,
    updatePhone: updateMutation.mutateAsync,
    deletePhone: deleteMutation.mutateAsync,
  };
}

// ============================================================================
// COMBINED REFERENCE DATA HOOK
// ============================================================================

/**
 * Hook to prefetch all reference data at app startup
 */
export function usePrefetchReferenceData() {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({ queryKey: ['highways'], queryFn: async () => {
      const response = await fetch('/api/highways');
      return response.json();
    }});
    
    queryClient.prefetchQuery({ queryKey: ['car-makes'], queryFn: async () => {
      const response = await fetch('/api/car-makes');
      return response.json();
    }});
    
    queryClient.prefetchQuery({ queryKey: ['agencies'], queryFn: async () => {
      const response = await fetch('/api/agencies');
      return response.json();
    }});
    
    queryClient.prefetchQuery({ queryKey: ['problem-codes'], queryFn: async () => {
      const response = await fetch('/api/problem-codes');
      return response.json();
    }});
  };

  return prefetch;
}
