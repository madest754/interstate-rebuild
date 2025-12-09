import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    // Fallback for when context is not available
    return {
      toast: (props: Omit<Toast, 'id'>) => {
        console.log('Toast:', props);
      },
    };
  }

  return {
    toast: context.addToast,
    dismiss: context.removeToast,
  };
}

const variantStyles = {
  default: 'bg-white border-slate-200',
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200',
};

const variantIcons = {
  default: null,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const variantIconColors = {
  default: '',
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

export function Toaster() {
  const context = useContext(ToastContext);
  const toasts = context?.toasts ?? [];
  const removeToast = context?.removeToast ?? (() => {});

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = variantIcons[toast.variant ?? 'default'];
        
        return (
          <div
            key={toast.id}
            className={cn(
              'p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full',
              variantStyles[toast.variant ?? 'default']
            )}
          >
            <div className="flex items-start gap-3">
              {Icon && (
                <Icon className={cn('h-5 w-5 shrink-0', variantIconColors[toast.variant ?? 'default'])} />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{toast.title}</p>
                {toast.description && (
                  <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Simple toast function for direct use
let toastFn: ((props: Omit<Toast, 'id'>) => void) | null = null;

export function setToastFunction(fn: (props: Omit<Toast, 'id'>) => void) {
  toastFn = fn;
}

export function toast(props: Omit<Toast, 'id'>) {
  if (toastFn) {
    toastFn(props);
  } else {
    console.log('Toast:', props);
  }
}
