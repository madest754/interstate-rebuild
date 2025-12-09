/**
 * Alert Component
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantStyles = {
  default: 'bg-background text-foreground border',
  destructive: 'border-destructive/50 text-destructive dark:border-destructive bg-destructive/10',
  success: 'border-green-500/50 text-green-700 dark:text-green-400 bg-green-500/10',
  warning: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10',
};

const variantIcons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
};

export function Alert({ 
  className, 
  variant = 'default', 
  dismissible = false,
  onDismiss,
  children,
  ...props 
}: AlertProps) {
  const [isDismissed, setIsDismissed] = React.useState(false);
  const Icon = variantIcons[variant];

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">{children}</div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  );
}
