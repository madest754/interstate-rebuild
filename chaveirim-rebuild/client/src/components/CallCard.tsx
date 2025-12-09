/**
 * CallCard Component
 * 
 * Displays a single call with all relevant information.
 * Used in the dashboard call list and call details view.
 */

import React, { useState } from 'react';
import { 
  Phone, 
  MapPin, 
  Car, 
  Clock, 
  User, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  UserPlus,
  X,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { Call, CallAssignment } from '../hooks/useCalls';

interface CallCardProps {
  call: Call;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onAssign?: (callId: string) => void;
  onClose?: (callId: string) => void;
  onReopen?: (callId: string) => void;
  onBroadcast?: (callId: string) => void;
  onViewDetails?: (callId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function CallCard({
  call,
  expanded = false,
  onToggleExpand,
  onAssign,
  onClose,
  onReopen,
  onBroadcast,
  onViewDetails,
  showActions = true,
  compact = false,
}: CallCardProps) {
  const isActive = call.status === 'active';
  const isClosed = call.status === 'closed';

  // Format time since created
  const timeSince = React.useMemo(() => {
    const created = new Date(call.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }, [call.createdAt]);

  // Build location string
  const locationString = React.useMemo(() => {
    if (call.freeTextLocation) {
      return call.freeTextLocation;
    }
    
    if (call.highwayId || call.customHighway) {
      const parts = [];
      parts.push(call.customHighway || 'Highway');
      if (call.direction) parts.push(call.direction);
      if (call.localExpress) parts.push(call.localExpress);
      if (call.betweenExit && call.andExit) {
        parts.push(`Exit ${call.betweenExit} - ${call.andExit}`);
      } else if (call.mileMarker) {
        parts.push(`MM ${call.mileMarker}`);
      }
      return parts.join(' • ');
    }
    
    if (call.address) {
      const parts = [call.address];
      if (call.city) parts.push(call.city);
      if (call.state) parts.push(call.state);
      return parts.join(', ');
    }
    
    return 'No location specified';
  }, [call]);

  // Build vehicle string
  const vehicleString = React.useMemo(() => {
    if (call.customVehicle) return call.customVehicle;
    
    const parts = [];
    if (call.carColor) parts.push(call.carColor);
    // Note: In real app, we'd lookup make/model names from IDs
    if (call.carMakeId) parts.push('Vehicle');
    if (call.vehicleComment) parts.push(`(${call.vehicleComment})`);
    
    return parts.length > 0 ? parts.join(' ') : null;
  }, [call]);

  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        call.urgent && 'border-red-500 border-2',
        isClosed && 'opacity-75',
        !compact && 'hover:shadow-md'
      )}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Call Number */}
            <span className={cn(
              'font-mono font-bold',
              compact ? 'text-base' : 'text-lg',
              call.urgent && 'text-red-600'
            )}>
              #{call.callNumber}
            </span>
            
            {/* Status Badge */}
            <Badge 
              variant={isActive ? 'default' : isClosed ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {call.status}
            </Badge>
            
            {/* Urgent Flag */}
            {call.urgent && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                URGENT
              </Badge>
            )}
          </div>
          
          {/* Time */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {timeSince}
          </div>
        </div>

        {/* Location Row */}
        <div className="mt-2 flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className={cn('text-sm', compact && 'line-clamp-1')}>
            {locationString}
          </span>
          {call.mapLink && (
            <a 
              href={call.mapLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Caller Info - Only show if not compact or expanded */}
        {(!compact || expanded) && call.callerName && (
          <div className="mt-2 flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{call.callerName}</span>
            {call.phone1 && (
              <a 
                href={`tel:${call.phone1}`}
                className="text-sm text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {call.phone1}
              </a>
            )}
          </div>
        )}

        {/* Vehicle Info */}
        {vehicleString && (!compact || expanded) && (
          <div className="mt-2 flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{vehicleString}</span>
          </div>
        )}

        {/* Dispatcher Message */}
        {call.dispatcherMessage && (!compact || expanded) && (
          <div className="mt-2 p-2 bg-muted rounded text-sm">
            <MessageSquare className="h-3 w-3 inline mr-1" />
            {call.dispatcherMessage}
          </div>
        )}

        {/* Assignments */}
        {call.assignments && call.assignments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {call.assignments.map((assignment) => (
              <AssignmentBadge 
                key={assignment.id} 
                assignment={assignment}
                compact={compact}
              />
            ))}
          </div>
        )}

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Additional Phones */}
            {(call.phone2 || call.phone3 || call.phone4) && (
              <div className="flex flex-wrap gap-2">
                {call.phone2 && (
                  <a href={`tel:${call.phone2}`} className="text-sm text-blue-600 hover:underline">
                    <Phone className="h-3 w-3 inline mr-1" />{call.phone2}
                  </a>
                )}
                {call.phone3 && (
                  <a href={`tel:${call.phone3}`} className="text-sm text-blue-600 hover:underline">
                    <Phone className="h-3 w-3 inline mr-1" />{call.phone3}
                  </a>
                )}
                {call.phone4 && (
                  <a href={`tel:${call.phone4}`} className="text-sm text-blue-600 hover:underline">
                    <Phone className="h-3 w-3 inline mr-1" />{call.phone4}
                  </a>
                )}
              </div>
            )}

            {/* Internal Notes */}
            {call.internalNotes && call.internalNotes.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Internal Notes:</span>
                {call.internalNotes.map((note, idx) => (
                  <div key={idx} className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                    <span className="text-xs text-muted-foreground">{note.author} • {note.timestamp}</span>
                    <p>{note.note}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Coordinates */}
            {(call.latitude && call.longitude) && (
              <div className="text-xs text-muted-foreground">
                Coordinates: {call.latitude}, {call.longitude}
                {call.territory && ` • Territory: ${call.territory}`}
              </div>
            )}
          </div>
        )}

        {/* Actions Row */}
        {showActions && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              {isActive && onAssign && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onAssign(call.id)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign
                </Button>
              )}
              
              {isActive && onBroadcast && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onBroadcast(call.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Broadcast
                </Button>
              )}
              
              {isActive && onClose && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onClose(call.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Close
                </Button>
              )}
              
              {isClosed && onReopen && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onReopen(call.id)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reopen
                </Button>
              )}
            </div>

            {onToggleExpand && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onToggleExpand}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    More
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Assignment Badge Component
 */
function AssignmentBadge({ 
  assignment, 
  compact 
}: { 
  assignment: CallAssignment; 
  compact?: boolean;
}) {
  const statusColors = {
    assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    enroute: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    onscene: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      statusColors[assignment.status]
    )}>
      <User className="h-3 w-3" />
      {assignment.member?.unitNumber || 'Unit'}
      {!compact && assignment.eta && (
        <span className="text-[10px] opacity-75">
          ({assignment.eta}min)
        </span>
      )}
    </div>
  );
}

/**
 * Call List Component
 */
interface CallListProps {
  calls: Call[];
  emptyMessage?: string;
  onAssign?: (callId: string) => void;
  onClose?: (callId: string) => void;
  onReopen?: (callId: string) => void;
  onBroadcast?: (callId: string) => void;
}

export function CallList({
  calls,
  emptyMessage = 'No calls to display',
  onAssign,
  onClose,
  onReopen,
  onBroadcast,
}: CallListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (calls.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <CallCard
          key={call.id}
          call={call}
          expanded={expandedId === call.id}
          onToggleExpand={() => setExpandedId(expandedId === call.id ? null : call.id)}
          onAssign={onAssign}
          onClose={onClose}
          onReopen={onReopen}
          onBroadcast={onBroadcast}
        />
      ))}
    </div>
  );
}

export default CallCard;
