import { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Phone, MapPin, Car, Users, Plus, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { 
  callsStore, 
  membersStore, 
  assignmentsStore,
  highwaysStore, 
  carMakesStore, 
  problemCodesStore,
  notesStore,
  type Call,
  type Member,
  type Assignment,
} from '@/lib/store';

interface CallFormProps {
  callId?: string;
  onBack: () => void;
}

export default function CallForm({ callId, onBack }: CallFormProps) {
  const isEditing = !!callId;
  const existingCall = callId ? callsStore.getById(callId) : null;

  // Form state
  const [nature, setNature] = useState(existingCall?.nature || '');
  const [urgent, setUrgent] = useState(existingCall?.urgent || false);
  const [callerPhone, setCallerPhone] = useState(existingCall?.callerPhone || '');
  const [callerName, setCallerName] = useState(existingCall?.callerName || '');
  const [callbackPhone, setCallbackPhone] = useState(existingCall?.callbackPhone || '');
  
  // Location
  const [locationType, setLocationType] = useState<'highway' | 'address' | 'freetext'>(
    existingCall?.highwayId ? 'highway' : existingCall?.address ? 'address' : 'freetext'
  );
  const [highwayId, setHighwayId] = useState(existingCall?.highwayId || '');
  const [direction, setDirection] = useState(existingCall?.direction || '');
  const [betweenExit, setBetweenExit] = useState(existingCall?.betweenExit || '');
  const [andExit, setAndExit] = useState(existingCall?.andExit || '');
  const [address, setAddress] = useState(existingCall?.address || '');
  const [city, setCity] = useState(existingCall?.city || '');
  const [state, setState] = useState(existingCall?.state || 'NJ');
  const [freeTextLocation, setFreeTextLocation] = useState(existingCall?.freeTextLocation || '');
  
  // Vehicle
  const [vehicleMake, setVehicleMake] = useState(existingCall?.vehicleMake || '');
  const [vehicleModel, setVehicleModel] = useState(existingCall?.vehicleModel || '');
  const [vehicleColor, setVehicleColor] = useState(existingCall?.vehicleColor || '');
  const [vehiclePlate, setVehiclePlate] = useState(existingCall?.vehicleLicensePlate || '');
  const [vehicleState, setVehicleState] = useState(existingCall?.vehicleState || 'NJ');
  
  // Notes
  const [notes, setNotes] = useState(existingCall?.notes || '');
  
  // Reference data
  const highways = highwaysStore.getAll();
  const carMakes = carMakesStore.getAll();
  const problemCodes = problemCodesStore.getAll();
  const exits = highwayId ? highwaysStore.getExits(highwayId) : [];
  const models = vehicleMake ? carMakesStore.getModels(carMakes.find(m => m.name === vehicleMake)?.id || '') : [];
  
  // Assignments
  const [assignments, setAssignments] = useState<(Assignment & { member?: Member })[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const searchResults = memberSearch.length >= 1 ? membersStore.search(memberSearch) : [];
  
  // Close call dialog
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  
  // Internal notes
  const [internalNotes, setInternalNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  // Load assignments and notes for existing call
  useEffect(() => {
    if (callId) {
      setAssignments(assignmentsStore.getByCallId(callId));
      setInternalNotes(notesStore.getByCallId(callId));
    }
  }, [callId]);

  const handleSave = () => {
    const callData = {
      nature,
      urgent,
      callerPhone,
      callerName,
      callbackPhone,
      highwayId: locationType === 'highway' ? highwayId : undefined,
      direction: locationType === 'highway' ? direction : undefined,
      betweenExit: locationType === 'highway' ? betweenExit : undefined,
      andExit: locationType === 'highway' ? andExit : undefined,
      address: locationType === 'address' ? address : undefined,
      city: locationType === 'address' ? city : undefined,
      state: locationType === 'address' ? state : undefined,
      freeTextLocation: locationType === 'freetext' ? freeTextLocation : undefined,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      vehicleLicensePlate: vehiclePlate,
      vehicleState,
      notes,
    };

    if (isEditing && callId) {
      callsStore.update(callId, callData);
    } else {
      callsStore.create(callData);
    }
    
    onBack();
  };

  const handleAssign = (member: Member) => {
    if (!callId) return;
    const newAssignment = assignmentsStore.create({
      callId,
      memberId: member.id,
      role: 'responder',
    });
    setAssignments([...assignments, { ...newAssignment, member }]);
    setMemberSearch('');
    setShowAssignDialog(false);
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    assignmentsStore.delete(assignmentId);
    setAssignments(assignments.filter(a => a.id !== assignmentId));
  };

  const handleAddNote = () => {
    if (!callId || !newNote.trim()) return;
    const note = notesStore.create(callId, newNote.trim());
    setInternalNotes([note, ...internalNotes]);
    setNewNote('');
  };

  const handleClose = () => {
    if (!callId) return;
    callsStore.close(callId, closeReason, closeNotes);
    onBack();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {isEditing ? `Edit Call ${existingCall?.callNumber}` : 'New Call'}
          </h1>
          {isEditing && existingCall && (
            <p className="text-sm text-slate-500">
              Status: <Badge variant={existingCall.status === 'active' ? 'success' : 'secondary'}>{existingCall.status}</Badge>
            </p>
          )}
        </div>
      </div>

      {/* Urgent Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <span className="font-medium text-red-700">🚨 URGENT CALL</span>
        </label>
      </div>

      {/* Problem/Nature */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Problem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {problemCodes.map(pc => (
                <button
                  key={pc.id}
                  onClick={() => setNature(pc.description)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    nature === pc.description 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pc.description}
                </button>
              ))}
            </div>
            <Input
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              placeholder="Or type a description..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Caller Info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Caller Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Caller Phone</Label>
              <Input
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                placeholder="(732) 555-1234"
              />
            </div>
            <div>
              <Label>Caller Name</Label>
              <Input
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
          </div>
          <div>
            <Label>Callback Phone (if different)</Label>
            <Input
              value={callbackPhone}
              onChange={(e) => setCallbackPhone(e.target.value)}
              placeholder="(732) 555-5678"
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Location Type Tabs */}
          <div className="flex gap-2">
            {(['highway', 'address', 'freetext'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setLocationType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  locationType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {type === 'highway' ? 'Highway' : type === 'address' ? 'Address' : 'Description'}
              </button>
            ))}
          </div>

          {/* Highway Fields */}
          {locationType === 'highway' && (
            <div className="space-y-3">
              <Select value={highwayId} onChange={(e) => setHighwayId(e.target.value)}>
                <option value="">Select Highway</option>
                {highways.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </Select>
              
              <div className="grid grid-cols-3 gap-2">
                <Select value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="">Direction</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                </Select>
                <Select value={betweenExit} onChange={(e) => setBetweenExit(e.target.value)}>
                  <option value="">Between Exit</option>
                  {exits.map(e => (
                    <option key={e.id} value={e.exitNumber}>{e.exitNumber} - {e.name}</option>
                  ))}
                </Select>
                <Select value={andExit} onChange={(e) => setAndExit(e.target.value)}>
                  <option value="">And Exit</option>
                  {exits.map(e => (
                    <option key={e.id} value={e.exitNumber}>{e.exitNumber} - {e.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {/* Address Fields */}
          {locationType === 'address' && (
            <div className="space-y-3">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street Address"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>
          )}

          {/* Free Text Location */}
          {locationType === 'freetext' && (
            <Textarea
              value={freeTextLocation}
              onChange={(e) => setFreeTextLocation(e.target.value)}
              placeholder="Describe the location..."
              rows={3}
            />
          )}
        </CardContent>
      </Card>

      {/* Vehicle */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Make</Label>
              <Select value={vehicleMake} onChange={(e) => { setVehicleMake(e.target.value); setVehicleModel(''); }}>
                <option value="">Select Make</option>
                {carMakes.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Model</Label>
              <Select value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)}>
                <option value="">Select Model</option>
                {models.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Color</Label>
              <Select value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)}>
                <option value="">Color</option>
                {['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Beige', 'Gold'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>License Plate</Label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="ABC123"
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={vehicleState}
                onChange={(e) => setVehicleState(e.target.value.toUpperCase())}
                placeholder="NJ"
                maxLength={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments (only for existing calls) */}
      {isEditing && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assigned Units ({assignments.length})
              </CardTitle>
              <Button size="sm" onClick={() => setShowAssignDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No units assigned yet</p>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-mono font-bold text-blue-600">{a.member?.unitNumber}</span>
                      <span className="ml-2">{a.member?.firstName} {a.member?.lastName}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveAssignment(a.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Internal Notes (only for existing calls) */}
      {isEditing && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <Button onClick={handleAddNote}>Add</Button>
            </div>
            {internalNotes.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-auto">
                {internalNotes.map(note => (
                  <div key={note.id} className="p-2 bg-yellow-50 rounded text-sm">
                    <p>{note.note}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Cancel
        </Button>
        {isEditing && existingCall?.status === 'active' && (
          <Button variant="secondary" onClick={() => setShowCloseDialog(true)}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Close Call
          </Button>
        )}
        <Button className="flex-1" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? 'Update' : 'Create Call'}
        </Button>
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)}>
        <DialogHeader onClose={() => setShowAssignDialog(false)}>Assign Unit</DialogHeader>
        <DialogContent>
          <Input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search by unit number or name..."
            autoFocus
          />
          <div className="mt-3 max-h-64 overflow-auto">
            {searchResults.map(member => (
              <button
                key={member.id}
                onClick={() => handleAssign(member)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg text-left"
              >
                <span className="font-mono font-bold text-blue-600">{member.unitNumber}</span>
                <span>{member.firstName} {member.lastName}</span>
              </button>
            ))}
            {memberSearch && searchResults.length === 0 && (
              <p className="text-center text-slate-500 py-4">No members found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Call Dialog */}
      <Dialog open={showCloseDialog} onClose={() => setShowCloseDialog(false)}>
        <DialogHeader onClose={() => setShowCloseDialog(false)}>Close Call</DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <div>
              <Label>Close Reason</Label>
              <Select value={closeReason} onChange={(e) => setCloseReason(e.target.value)}>
                <option value="">Select reason...</option>
                <option value="resolved">Resolved</option>
                <option value="towed">Vehicle Towed</option>
                <option value="cancelled">Caller Cancelled</option>
                <option value="no_response">No Response</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Close Notes</Label>
              <Textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
          <Button onClick={handleClose} disabled={!closeReason}>Close Call</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
