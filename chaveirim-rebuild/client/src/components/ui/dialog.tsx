/**
 * Dialog Component
 * 
 * Modal dialog using native HTML dialog element.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ 
  children, 
  asChild = false,
  className,
}: { 
  children: React.ReactNode; 
  asChild?: boolean;
  className?: string;
}) {
  const context = React.useContext(DialogContext);
  
  if (!context) {
    throw new Error('DialogTrigger must be used within a Dialog');
  }

  const handleClick = () => context.setOpen(true);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
    });
  }

  return (
    <button 
      type="button" 
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export function DialogContent({ children, className, showClose = true }: DialogContentProps) {
  const context = React.useContext(DialogContext);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  
  if (!context) {
    throw new Error('DialogContent must be used within a Dialog');
  }

  const { open, setOpen } = context;

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog.close();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'fixed inset-0 z-50 m-auto max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-background p-0 shadow-lg',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'open:animate-in open:fade-in-0 open:zoom-in-95',
        className
      )}
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === dialogRef.current) {
          setOpen(false);
        }
      }}
    >
      <div className="relative p-6">
        {showClose && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
        {children}
      </div>
    </dialog>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  );
}

export function DialogClose({ children, className }: { children: React.ReactNode; className?: string }) {
  const context = React.useContext(DialogContext);
  
  if (!context) {
    throw new Error('DialogClose must be used within a Dialog');
  }

  return (
    <button
      type="button"
      onClick={() => context.setOpen(false)}
      className={className}
    >
      {children}
    </button>
  );
}
