/**
 * QueueStatus Component
 * 
 * Displays current phone queue status and allows login/logout.
 */

import React, { useState } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle,
  LogIn,
  LogOut,
  Users,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Spinner } from './ui/spinner';
import { 
  useQueueMembers, 
  useQueueMutations, 
  useDispatcherStatus,
  useCurrentMember,
  type QueueSession,
} from '../hooks';

interface QueueStatusProps {
  className?: string;
  compact?: boolean;
}

export function QueueStatus({ className, compact = false }: QueueStatusProps) {
  const { data: queueMembers, isLoading, refetch } = useQueueMembers();
  const { data: dispatcherStatus } = useDispatcherStatus();
  const { data: currentMember } = useCurrentMember();
  const { queueLogin, queueLogout, isLoggingIn, isLoggingOut, loginError } = useQueueMutations();

  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<string>('primary');

  // Check if current user is logged in to any queue
  const userQueueStatus = React.useMemo(() => {
    if (!currentMember || !queueMembers) return null;
    
    const queues: Record<string, boolean> = {};
    for (const [queue, members] of Object.entries(queueMembers)) {
      queues[queue] = (members as any[]).some(m => m.memberId === currentMember.id);
    }
    return queues;
  }, [currentMember, queueMembers]);

  const isLoggedInAnyQueue = userQueueStatus && Object.values(userQueueStatus).some(v => v);

  const handleLogin = async (queue: string) => {
    if (!currentMember) return;
    
    try {
      await queueLogin({
        memberId: currentMember.id,
        queue,
        phoneNumbers: currentMember.phone ? [currentMember.phone] : undefined,
      });
      setShowLoginDialog(false);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async (queue?: string) => {
    if (!currentMember) return;
    
    try {
      await queueLogout({
        memberId: currentMember.id,
        queue,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {/* Current Dispatcher */}
        {dispatcherStatus?.currentDispatcher ? (
          <Badge variant="success" className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {dispatcherStatus.currentDispatcher.unitNumber}
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1">
            <PhoneOff className="h-3 w-3" />
            No Dispatcher
          </Badge>
        )}

        {/* Queue Counts */}
        {queueMembers && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              P: {(queueMembers.primary as any[])?.length || 0}
            </span>
            <span>
              S: {(queueMembers.secondary as any[])?.length || 0}
            </span>
          </div>
        )}

        {/* Login/Logout Button */}
        {currentMember && (
          isLoggedInAnyQueue ? (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleLogout()}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4 mr-1" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="default"
              onClick={() => setShowLoginDialog(true)}
            >
              <LogIn className="h-4 w-4 mr-1" />
              Login
            </Button>
          )
        )}
      </div>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Queue Status
            </CardTitle>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Dispatcher */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Current Dispatcher
            </div>
            {dispatcherStatus?.currentDispatcher ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">
                    {dispatcherStatus.currentDispatcher.unitNumber}
                  </span>
                  <span className="text-muted-foreground">
                    {dispatcherStatus.currentDispatcher.firstName} {dispatcherStatus.currentDispatcher.lastName}
                  </span>
                </div>
                {dispatcherStatus.loginTime && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeSince(dispatcherStatus.loginTime)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>No dispatcher currently on duty</span>
              </div>
            )}
          </div>

          {/* Queue Lists */}
          <div className="grid gap-3">
            {['primary', 'secondary', 'third'].map((queue) => (
              <QueueList
                key={queue}
                name={queue}
                members={(queueMembers?.[queue] as any[]) || []}
                isUserInQueue={userQueueStatus?.[queue] || false}
                onJoin={() => handleLogin(queue)}
                onLeave={() => handleLogout(queue)}
                disabled={isLoggingIn || isLoggingOut}
              />
            ))}
          </div>

          {/* User Actions */}
          {currentMember && (
            <div className="pt-3 border-t">
              {isLoggedInAnyQueue ? (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleLogout()}
                  disabled={isLoggingOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLoggingOut ? 'Logging out...' : 'Logout from All Queues'}
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => setShowLoginDialog(true)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login to Queue
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login to Phone Queue</DialogTitle>
            <DialogDescription>
              Select which queue you want to join for receiving calls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {['primary', 'secondary', 'third'].map((queue) => (
              <button
                key={queue}
                type="button"
                onClick={() => setSelectedQueue(queue)}
                className={cn(
                  'w-full p-4 rounded-lg border-2 text-left transition-colors',
                  selectedQueue === queue 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <div className="font-medium capitalize">{queue} Queue</div>
                <div className="text-sm text-muted-foreground">
                  {queue === 'primary' && 'First to receive calls'}
                  {queue === 'secondary' && 'Overflow from primary'}
                  {queue === 'third' && 'Additional backup'}
                </div>
              </button>
            ))}
          </div>

          {loginError && (
            <div className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {(loginError as Error).message}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowLoginDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleLogin(selectedQueue)}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Individual Queue List
 */
interface QueueListProps {
  name: string;
  members: Array<{
    memberId: string;
    name: string;
    unitNumber: string;
    phoneNumber?: string;
    loggedInAt: string;
  }>;
  isUserInQueue: boolean;
  onJoin: () => void;
  onLeave: () => void;
  disabled?: boolean;
}

function QueueList({ 
  name, 
  members, 
  isUserInQueue, 
  onJoin, 
  onLeave,
  disabled,
}: QueueListProps) {
  const queueColors = {
    primary: 'border-l-blue-500',
    secondary: 'border-l-yellow-500',
    third: 'border-l-gray-500',
  };

  return (
    <div className={cn(
      'p-3 bg-muted/50 rounded-lg border-l-4',
      queueColors[name as keyof typeof queueColors] || 'border-l-gray-500'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">{name}</span>
          <Badge variant="outline" className="text-xs">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </Badge>
        </div>
        
        {isUserInQueue ? (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onLeave}
            disabled={disabled}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Leave
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onJoin}
            disabled={disabled}
          >
            <LogIn className="h-3 w-3 mr-1" />
            Join
          </Button>
        )}
      </div>

      {members.length > 0 ? (
        <div className="space-y-1">
          {members.map((member, idx) => (
            <div 
              key={member.memberId}
              className="flex items-center justify-between text-sm py-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{idx + 1}.</span>
                <span className="font-medium">{member.unitNumber}</span>
                <span className="text-muted-foreground">{member.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatTimeSince(member.loggedInAt)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No members in queue
        </div>
      )}
    </div>
  );
}

/**
 * Format time since login
 */
function formatTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export default QueueStatus;
