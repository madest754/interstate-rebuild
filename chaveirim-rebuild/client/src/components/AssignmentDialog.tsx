/**
 * AssignmentDialog Component
 * 
 * Dialog for assigning members to a call with ETA selection.
 */

import React, { useState } from 'react';
import { UserPlus, Clock, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Spinner } from './ui/spinner';
import { MemberSearch } from './MemberSearch';
import { useCallMutations, type Member, type Call, type CallAssignment } from '../hooks';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: Call;
  onSuccess?: () => void;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  call,
  onSuccess,
}: AssignmentDialogProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [eta, setEta] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { assignMember } = useCallMutations();

  // Get already assigned member IDs
  const assignedMemberIds = call.assignments?.map(a => a.memberId) || [];

  const handleSubmit = async () => {
    if (!selectedMember) {
      setError('Please select a member');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await assignMember({
        callId: call.id,
        memberId: selectedMember.id,
        eta: eta ? parseInt(eta, 10) : undefined,
      });

      // Reset form
      setSelectedMember(null);
      setEta('');
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to assign member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedMember(null);
    setEta('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Member to Call #{call.callNumber}
          </DialogTitle>
          <DialogDescription>
            Select a member to respond to this call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Member Search */}
          <div className="space-y-2">
            <Label>Member</Label>
            <MemberSearch
              value={selectedMember?.id}
              onSelect={setSelectedMember}
              placeholder="Search by name or unit number..."
              excludeIds={assignedMemberIds}
            />
          </div>

          {/* ETA */}
          <div className="space-y-2">
            <Label htmlFor="eta" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              ETA (minutes)
            </Label>
            <Input
              id="eta"
              type="number"
              min="1"
              max="120"
              placeholder="e.g., 15"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20, 30].map((mins) => (
                <Button
                  key={mins}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEta(mins.toString())}
                  className={cn(
                    eta === mins.toString() && 'bg-primary text-primary-foreground'
                  )}
                >
                  {mins}m
                </Button>
              ))}
            </div>
          </div>

          {/* Currently Assigned */}
          {call.assignments && call.assignments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Already Assigned</Label>
              <div className="flex flex-wrap gap-2">
                {call.assignments.map((assignment) => (
                  <span
                    key={assignment.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-sm"
                  >
                    {assignment.member?.unitNumber || 'Unit'}
                    {assignment.eta && (
                      <span className="text-xs text-muted-foreground">
                        ({assignment.eta}m)
                      </span>
                    )}
                  </span>
                ))}
              </div>
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedMember || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Assigning...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Assign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Remove Assignment Dialog
 */
interface RemoveAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: Call;
  assignment: CallAssignment;
  onSuccess?: () => void;
}

export function RemoveAssignmentDialog({
  open,
  onOpenChange,
  call,
  assignment,
  onSuccess,
}: RemoveAssignmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { unassignMember } = useCallMutations();

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      await unassignMember({
        callId: call.id,
        assignmentId: assignment.id,
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to remove assignment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove Assignment</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {assignment.member?.unitNumber || 'this member'} from call #{call.callNumber}?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Removing...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Remove
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Assignment List Component for displaying current assignments
 */
interface AssignmentListProps {
  call: Call;
  onAdd?: () => void;
  onRemove?: (assignment: CallAssignment) => void;
  editable?: boolean;
}

export function AssignmentList({
  call,
  onAdd,
  onRemove,
  editable = true,
}: AssignmentListProps) {
  const assignments = call.assignments || [];

  const statusColors = {
    assigned: 'bg-blue-100 text-blue-800 border-blue-200',
    enroute: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    onscene: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Assigned Members</Label>
        {editable && onAdd && (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg border',
                statusColors[assignment.status] || statusColors.assigned
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {assignment.member?.unitNumber || 'Unit'}
                </span>
                <span className="text-sm">
                  {assignment.member?.firstName} {assignment.member?.lastName}
                </span>
                {assignment.eta && (
                  <span className="text-xs px-1.5 py-0.5 bg-white/50 rounded">
                    ETA: {assignment.eta}m
                  </span>
                )}
                <span className="text-xs capitalize">
                  {assignment.status}
                </span>
              </div>

              {editable && onRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onRemove(assignment)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AssignmentDialog;
