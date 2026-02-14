import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
      />
      <div className={cn(
        'relative bg-white rounded-xl shadow-xl max-h-[90vh] overflow-auto',
        'w-full max-w-lg mx-4',
        className
      )}>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h2 className="text-lg font-semibold">{children}</h2>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>
      )}
    </div>
  );
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 p-4 border-t bg-slate-50', className)}>
      {children}
    </div>
  );
}
