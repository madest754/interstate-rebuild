/**
 * ConnectionStatus Component
 * 
 * Shows real-time connection status indicator.
 */

import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useConnectionStatus } from '../hooks/useWebSocket';

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConnectionStatus({
  className,
  showText = false,
  size = 'sm',
}: ConnectionStatusProps) {
  const { status, isConnected, statusColor, statusText } = useConnectionStatus();

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const dotSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status dot */}
      <div className="relative flex items-center justify-center">
        <span
          className={cn(
            'rounded-full',
            dotSizes[size],
            colorClasses[statusColor as keyof typeof colorClasses]
          )}
        />
        {/* Pulse animation for connected state */}
        {isConnected && (
          <span
            className={cn(
              'absolute rounded-full animate-ping opacity-75',
              dotSizes[size],
              'bg-green-400'
            )}
          />
        )}
      </div>

      {/* Status text */}
      {showText && (
        <span className={cn(
          'text-muted-foreground',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base'
        )}>
          {statusText}
        </span>
      )}

      {/* Icon for disconnected/connecting states */}
      {!isConnected && (
        status === 'connecting' ? (
          <Loader2 className={cn(sizeClasses[size], 'animate-spin text-yellow-500')} />
        ) : (
          <WifiOff className={cn(sizeClasses[size], 'text-red-500')} />
        )
      )}
    </div>
  );
}

/**
 * Offline Banner Component
 * 
 * Shows when the app is offline.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
      <WifiOff className="inline h-4 w-4 mr-2" />
      You are currently offline. Some features may not be available.
    </div>
  );
}

/**
 * Network Status Hook
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [effectiveType, setEffectiveType] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type if available
    const connection = (navigator as any).connection;
    if (connection) {
      setEffectiveType(connection.effectiveType);
      
      const handleChange = () => {
        setEffectiveType(connection.effectiveType);
      };
      
      connection.addEventListener('change', handleChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    effectiveType,
    isSlow: effectiveType === '2g' || effectiveType === 'slow-2g',
  };
}

export default ConnectionStatus;
