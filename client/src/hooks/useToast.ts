/**
 * useToast Hook
 * 
 * Simple toast notification system using a global state pattern.
 * No JSX in this file - all rendering happens in the Toaster component.
 */

import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

type ToastInput = Omit<Toast, 'id'>;

// Global toast state
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toastState: Toast[] = [];
let toastIdCounter = 0;

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toastState]));
}

function addToastGlobal(toast: ToastInput): string {
  const id = `toast-${++toastIdCounter}`;
  const newToast: Toast = { ...toast, id };
  toastState = [...toastState, newToast];
  notifyListeners();
  
  // Auto-remove after duration
  const duration = toast.duration ?? 5000;
  if (duration > 0) {
    setTimeout(() => {
      removeToastGlobal(id);
    }, duration);
  }
  
  return id;
}

function removeToastGlobal(id: string) {
  toastState = toastState.filter(t => t.id !== id);
  notifyListeners();
}

// Global toast functions for use outside React components
export const toast = {
  success: (title: string, message?: string) => 
    addToastGlobal({ type: 'success', title, message }),
  error: (title: string, message?: string) => 
    addToastGlobal({ type: 'error', title, message }),
  warning: (title: string, message?: string) => 
    addToastGlobal({ type: 'warning', title, message }),
  info: (title: string, message?: string) => 
    addToastGlobal({ type: 'info', title, message }),
  dismiss: (id: string) => removeToastGlobal(id),
  dismissAll: () => {
    toastState = [];
    notifyListeners();
  },
};

/**
 * Hook to access and manage toasts
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState);

  useEffect(() => {
    // Subscribe to toast changes
    const listener = (newToasts: Toast[]) => setToasts(newToasts);
    toastListeners.push(listener);
    
    // Sync initial state
    setToasts([...toastState]);
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const addToast = useCallback((input: ToastInput) => {
    return addToastGlobal(input);
  }, []);

  const removeToast = useCallback((id: string) => {
    removeToastGlobal(id);
  }, []);

  const success = useCallback((title: string, message?: string) => {
    return addToastGlobal({ type: 'success', title, message });
  }, []);

  const error = useCallback((title: string, message?: string) => {
    return addToastGlobal({ type: 'error', title, message });
  }, []);

  const warning = useCallback((title: string, message?: string) => {
    return addToastGlobal({ type: 'warning', title, message });
  }, []);

  const info = useCallback((title: string, message?: string) => {
    return addToastGlobal({ type: 'info', title, message });
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

// Legacy exports for compatibility
export const setToastRef = () => {};
export const ToastProvider = ({ children }: { children: React.ReactNode }) => children;

export default useToast;
