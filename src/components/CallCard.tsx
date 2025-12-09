import { Phone, MapPin, Car, Clock, AlertTriangle, Users, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { formatRelativeTime, formatPhone } from '@/lib/utils';
import { type Call, type Assignment, assignmentsStore, membersStore } from '@/lib/store';

interface CallCardProps {
  call: Call;
  onClick?: () => void;
}

export function CallCard({ call, onClick }: CallCardProps) {
  const assignments = assignmentsStore.getByCallId(call.id);
  
  const getLocationDisplay = () => {
    if (call.highwayId) {
      return `Highway ${call.betweenExit ? `Exit ${call.betweenExit}` : ''} ${call.andExit ? `- ${call.andExit}` : ''} ${call.direction || ''}`;
    }
    if (call.address) {
      return `${call.address}${call.city ? `, ${call.city}` : ''}`;
    }
    if (call.freeTextLocation) {
      return call.freeTextLocation;
    }
    return 'Location not specified';
  };

  const getVehicleDisplay = () => {
    const parts = [call.vehicleColor, call.vehicleMake, call.vehicleModel].filter(Boolean);
    if (parts.length === 0) return null;
    return parts.join(' ');
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${call.urgent ? 'border-l-4 border-l-red-500' : ''}`}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-blue-600">{call.callNumber}</span>
            {call.urgent && (
              <Badge variant="danger" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                URGENT
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{formatRelativeTime(call.createdAt)}</span>
          </div>
        </div>

        {/* Nature */}
        <h3 className="font-semibold text-lg mb-2">{call.nature}</h3>

        {/* Details */}
        <div className="space-y-2 text-sm text-slate-600">
          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
            <span>{getLocationDisplay()}</span>
          </div>

          {/* Vehicle */}
          {getVehicleDisplay() && (
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-slate-400" />
              <span>{getVehicleDisplay()}</span>
              {call.vehicleLicensePlate && (
                <Badge variant="outline" className="font-mono">
                  {call.vehicleLicensePlate}
                </Badge>
              )}
            </div>
          )}

          {/* Caller */}
          {call.callerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>
                {call.callerName && <span className="font-medium">{call.callerName} - </span>}
                {formatPhone(call.callerPhone)}
              </span>
            </div>
          )}

          {/* Assigned Units */}
          {assignments.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <div className="flex flex-wrap gap-1">
                {assignments.map((a) => (
                  <Badge key={a.id} variant="success">
                    {a.member?.unitNumber || 'Unknown'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes preview */}
        {call.notes && (
          <p className="mt-3 text-sm text-slate-500 line-clamp-2 italic">
            {call.notes}
          </p>
        )}

        {/* Click indicator */}
        <div className="flex items-center justify-end mt-3 text-blue-600">
          <span className="text-sm font-medium">View Details</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
