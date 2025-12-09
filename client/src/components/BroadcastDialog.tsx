/**
 * BroadcastDialog Component
 * 
 * Dialog for broadcasting call information to members via various channels.
 */

import React, { useState, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  Phone, 
  Mail, 
  Copy, 
  Check,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { CheckboxWithLabel } from './ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Spinner } from './ui/spinner';
import { useCallMutations, type Call } from '../hooks';
import { useHighways, useCarMakes, useAgencies, useProblemCodes } from '../hooks';

interface BroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: Call;
  onSuccess?: () => void;
}

export function BroadcastDialog({
  open,
  onOpenChange,
  call,
  onSuccess,
}: BroadcastDialogProps) {
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState({
    whatsapp: true,
    sms: false,
    email: false,
  });
  const [isSending, setIsSending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { broadcastCall } = useCallMutations();
  
  // Reference data for building message
  const { data: highways } = useHighways();
  const { data: carMakes } = useCarMakes();
  const { data: agencies } = useAgencies();
  const { data: problemCodes } = useProblemCodes();

  // Generate default message when dialog opens
  useEffect(() => {
    if (open) {
      setMessage(generateBroadcastMessage(call, { highways, carMakes, agencies, problemCodes }));
      setError(null);
    }
  }, [open, call, highways, carMakes, agencies, problemCodes]);

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await broadcastCall({
        callId: call.id,
        message: message.trim(),
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to send broadcast');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleChannel = (channel: keyof typeof channels) => {
    setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Broadcast Call #{call.callNumber}
          </DialogTitle>
          <DialogDescription>
            Send this call information to members and response channels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Channels */}
          <div className="space-y-2">
            <Label>Send via</Label>
            <div className="flex flex-wrap gap-4">
              <CheckboxWithLabel
                label="WhatsApp"
                checked={channels.whatsapp}
                onCheckedChange={() => toggleChannel('whatsapp')}
              />
              <CheckboxWithLabel
                label="SMS"
                checked={channels.sms}
                onCheckedChange={() => toggleChannel('sms')}
              />
              <CheckboxWithLabel
                label="Email"
                checked={channels.email}
                onCheckedChange={() => toggleChannel('email')}
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Message</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Urgent Warning */}
          {call.urgent && (
            <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">This is an URGENT call</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={isSending || !Object.values(channels).some(v => v)}
          >
            {isSending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Broadcast
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Generate broadcast message from call data
 */
interface ReferenceData {
  highways?: any[];
  carMakes?: any[];
  agencies?: any[];
  problemCodes?: any[];
}

function generateBroadcastMessage(call: Call, refData: ReferenceData): string {
  const lines: string[] = [];

  // Header
  lines.push(`🚨 CALL #${call.callNumber}${call.urgent ? ' - URGENT' : ''}`);
  lines.push('');

  // Nature/Problem
  if (call.nature && refData.problemCodes) {
    const problemCode = refData.problemCodes.find((p: any) => p.id === call.nature);
    if (problemCode) {
      lines.push(`📋 Nature: ${problemCode.name}`);
    }
  }

  // Location
  lines.push('');
  lines.push('📍 LOCATION:');
  
  if (call.freeTextLocation) {
    lines.push(call.freeTextLocation);
  } else if (call.highwayId || call.customHighway) {
    const parts: string[] = [];
    
    if (call.highwayId && refData.highways) {
      const highway = refData.highways.find((h: any) => h.id === call.highwayId);
      parts.push(highway?.name || 'Highway');
    } else if (call.customHighway) {
      parts.push(call.customHighway);
    }
    
    if (call.direction) parts.push(call.direction);
    if (call.localExpress) parts.push(call.localExpress);
    
    lines.push(parts.join(' '));
    
    if (call.betweenExit && call.andExit) {
      lines.push(`Between Exit ${call.betweenExit} and Exit ${call.andExit}`);
    } else if (call.mileMarker) {
      lines.push(`Mile Marker ${call.mileMarker}`);
    }
  } else if (call.address) {
    lines.push(call.address);
    if (call.city || call.state) {
      lines.push([call.city, call.state, call.zip].filter(Boolean).join(', '));
    }
  }

  // Map Link
  if (call.mapLink) {
    lines.push('');
    lines.push(`🗺️ Map: ${call.mapLink}`);
  }

  // Vehicle
  if (call.carMakeId || call.carColor || call.customVehicle) {
    lines.push('');
    lines.push('🚗 VEHICLE:');
    
    if (call.customVehicle) {
      lines.push(call.customVehicle);
    } else {
      const vehicleParts: string[] = [];
      if (call.carColor) vehicleParts.push(call.carColor);
      
      if (call.carMakeId && refData.carMakes) {
        const make = refData.carMakes.find((m: any) => m.id === call.carMakeId);
        if (make) vehicleParts.push(make.name);
      }
      
      lines.push(vehicleParts.join(' '));
    }
    
    if (call.vehicleComment) {
      lines.push(call.vehicleComment);
    }
  }

  // Caller Info
  if (call.callerName || call.phone1) {
    lines.push('');
    lines.push('👤 CALLER:');
    if (call.callerName) lines.push(call.callerName);
    if (call.phone1) lines.push(`📞 ${call.phone1}`);
  }

  // Dispatcher Message
  if (call.dispatcherMessage) {
    lines.push('');
    lines.push('💬 MESSAGE:');
    lines.push(call.dispatcherMessage);
  }

  // Footer
  lines.push('');
  lines.push('---');
  lines.push('Please respond if you can assist.');

  return lines.join('\n');
}

export default BroadcastDialog;
