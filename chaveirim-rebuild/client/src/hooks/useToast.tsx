/**
 * Toast Hook
 * 
 * Simple toast notification system using React state.
 */

import { useState, useCallback, createContext, useContext, ReactNode } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string) => {
    addToast({ type: 'success', message });
  }, [addToast]);

  const error = useCallback((message: string) => {
    addToast({ type: 'error', message, duration: 7000 });
  }, [addToast]);

  const warning = useCallback((message: string) => {
    addToast({ type: 'warning', message });
  }, [addToast]);

  const info = useCallback((message: string) => {
    addToast({ type: 'info', message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}

/**
 * Standalone toast functions for use outside React components
 */
let toastRef: ToastContextType | null = null;

export function setToastRef(ref: ToastContextType) {
  toastRef = ref;
}

export const toast = {
  success: (message: string) => toastRef?.success(message),
  error: (message: string) => toastRef?.error(message),
  warning: (message: string) => toastRef?.warning(message),
  info: (message: string) => toastRef?.info(message),
};
