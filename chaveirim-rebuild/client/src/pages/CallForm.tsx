import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Trash2, 
  MapPin, 
  Car, 
  User, 
  Phone,
  AlertTriangle,
  Plus,
  X,
  Loader2,
  Copy,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { cn, formatPhoneNumber, copyToClipboard, generateCallBroadcast } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';

interface CallFormProps {
  callId?: string;
  onBack: () => void;
}

type LocationType = 'address' | 'highway' | 'freetext';

interface FormData {
  // Request info
  requestedBy1?: string;
  requestedBy2?: string;
  nature?: string;
  
  // Caller info
  callerName: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
  
  // Location - Address
  address: string;
  city: string;
  state: string;
  zip: string;
  
  // Location - Highway
  highwayId: string;
  customHighway: string;
  direction: string;
  localExpress: string;
  betweenExit: string;
  andExit: string;
  mileMarker: string;
  
  // Location - Free text
  freeTextLocation: string;
  
  // Map
  mapLink: string;
  latitude: string;
  longitude: string;
  territory: string;
  
  // Vehicle
  carMakeId: string;
  carModelId: string;
  carColor: string;
  customVehicle: string;
  vehicleComment: string;
  
  // Notes
  dispatcherMessage: string;
  internalNotes: Array<{ note: string; timestamp: string; author: string }>;
  
  // Flags
  urgent: boolean;
}

const initialFormData: FormData = {
  callerName: '',
  phone1: '',
  phone2: '',
  phone3: '',
  phone4: '',
  address: '',
  city: '',
  state: 'NJ',
  zip: '',
  highwayId: '',
  customHighway: '',
  direction: '',
  localExpress: '',
  betweenExit: '',
  andExit: '',
  mileMarker: '',
  freeTextLocation: '',
  mapLink: '',
  latitude: '',
  longitude: '',
  territory: '',
  carMakeId: '',
  carModelId: '',
  carColor: '',
  customVehicle: '',
  vehicleComment: '',
  dispatcherMessage: '',
  internalNotes: [],
  urgent: false,
};

export default function CallForm({ callId, onBack }: CallFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [locationType, setLocationType] = useState<LocationType>('highway');
  const [newNote, setNewNote] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const isEditing = !!callId;

  // Fetch existing call if editing
  const { data: existingCall, isLoading: loadingCall } = useQuery({
    queryKey: ['call', callId],
    queryFn: async () => {
      const res = await fetch(`/api/calls/${callId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch call');
      return res.json();
    },
    enabled: isEditing,
  });

  // Fetch reference data
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const res = await fetch('/api/agencies', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: problemCodes = [] } = useQuery({
    queryKey: ['problem-codes'],
    queryFn: async () => {
      const res = await fetch('/api/problem-codes', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: highways = [] } = useQuery({
    queryKey: ['highways'],
    queryFn: async () => {
      const res = await fetch('/api/highways', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: carMakes = [] } = useQuery({
    queryKey: ['car-makes'],
    queryFn: async () => {
      const res = await fetch('/api/car-makes', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: carModels = [] } = useQuery({
    queryKey: ['car-models', formData.carMakeId],
    queryFn: async () => {
      if (!formData.carMakeId) return [];
      const res = await fetch(`/api/car-models?makeId=${formData.carMakeId}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!formData.carMakeId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await fetch('/api/members', { credentials: 'include' });
      return res.json();
    },
  });

  // Load existing call data
  useEffect(() => {
    if (existingCall) {
      setFormData({
        ...initialFormData,
        ...existingCall,
        internalNotes: existingCall.internalNotes || [],
      });
      
      // Determine location type
      if (existingCall.highwayId || existingCall.customHighway) {
        setLocationType('highway');
      } else if (existingCall.address) {
        setLocationType('address');
      } else {
        setLocationType('freetext');
      }
    }
  }, [existingCall]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<FormData>) => {
      const url = isEditing ? `/api/calls/${callId}` : '/api/calls';
      const method = isEditing ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error('Failed to save call');
      return res.json();
    },
    onSuccess: (savedCall) => {
      toast({ title: isEditing ? 'Call updated' : 'Call created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      if (!isEditing) {
        // Navigate to edit the new call or back to dashboard
        onBack();
      }
    },
    onError: (error) => {
      toast({ title: 'Error saving call', description: error.message, variant: 'error' });
    },
  });

  // Close call mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/calls/${callId}/close`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to close call');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Call closed', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      onBack();
    },
  });

  // Broadcast mutation
  const broadcastMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/calls/${callId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Failed to broadcast');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Call broadcasted', variant: 'success' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleBroadcast = () => {
    const message = generateCallBroadcast(formData, members);
    broadcastMutation.mutate(message);
  };

  const handleCopyBroadcast = async () => {
    const message = generateCallBroadcast(formData, members);
    const success = await copyToClipboard(message);
    toast({ 
      title: success ? 'Copied to clipboard' : 'Failed to copy',
      variant: success ? 'success' : 'error'
    });
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loadingCall) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {isEditing ? `Call #${existingCall?.callNumber}` : 'New Call'}
            </h1>
            {isEditing && existingCall?.status === 'closed' && (
              <span className="text-sm text-green-600">Closed</span>
            )}
          </div>
        </div>
        
        {/* Urgent toggle */}
        <Button
          variant={formData.urgent ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => updateField('urgent', !formData.urgent)}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {formData.urgent ? 'URGENT' : 'Mark Urgent'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Requested By</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3"
                  value={formData.requestedBy1 || ''}
                  onChange={(e) => updateField('requestedBy1', e.target.value)}
                >
                  <option value="">Select agency...</option>
                  {agencies.map((agency: any) => (
                    <option key={agency.id} value={agency.id}>{agency.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Nature</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3"
                  value={formData.nature || ''}
                  onChange={(e) => updateField('nature', e.target.value)}
                >
                  <option value="">Select nature...</option>
                  {problemCodes.map((code: any) => (
                    <option key={code.id} value={code.id}>{code.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Caller Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Caller Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Caller Name</label>
              <Input
                value={formData.callerName}
                onChange={(e) => updateField('callerName', e.target.value)}
                placeholder="John Smith"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone 1</label>
                <Input
                  value={formData.phone1}
                  onChange={(e) => updateField('phone1', e.target.value)}
                  placeholder="(732) 555-1234"
                  type="tel"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone 2</label>
                <Input
                  value={formData.phone2}
                  onChange={(e) => updateField('phone2', e.target.value)}
                  placeholder="(732) 555-5678"
                  type="tel"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location type tabs */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={locationType === 'highway' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocationType('highway')}
              >
                Highway
              </Button>
              <Button
                type="button"
                variant={locationType === 'address' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocationType('address')}
              >
                Address
              </Button>
              <Button
                type="button"
                variant={locationType === 'freetext' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocationType('freetext')}
              >
                Free Text
              </Button>
            </div>

            {locationType === 'highway' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Highway</label>
                    <select
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3"
                      value={formData.highwayId || ''}
                      onChange={(e) => updateField('highwayId', e.target.value)}
                    >
                      <option value="">Select highway...</option>
                      {highways.map((hw: any) => (
                        <option key={hw.id} value={hw.id}>{hw.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Direction</label>
                    <select
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3"
                      value={formData.direction || ''}
                      onChange={(e) => updateField('direction', e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="North">Northbound</option>
                      <option value="South">Southbound</option>
                      <option value="East">Eastbound</option>
                      <option value="West">Westbound</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Between Exit</label>
                    <Input
                      value={formData.betweenExit}
                      onChange={(e) => updateField('betweenExit', e.target.value)}
                      placeholder="105"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">And Exit</label>
                    <Input
                      value={formData.andExit}
                      onChange={(e) => updateField('andExit', e.target.value)}
                      placeholder="106"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mile Marker</label>
                    <Input
                      value={formData.mileMarker}
                      onChange={(e) => updateField('mileMarker', e.target.value)}
                      placeholder="88.5"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {locationType === 'address' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Street Address</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="123 Main St"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Lakewood"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      placeholder="NJ"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ZIP</label>
                    <Input
                      value={formData.zip}
                      onChange={(e) => updateField('zip', e.target.value)}
                      placeholder="08701"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {locationType === 'freetext' && (
              <div>
                <label className="text-sm font-medium">Location Description</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 min-h-[80px]"
                  value={formData.freeTextLocation}
                  onChange={(e) => updateField('freeTextLocation', e.target.value)}
                  placeholder="Describe the location..."
                />
              </div>
            )}

            {/* Map link */}
            <div>
              <label className="text-sm font-medium">Map Link</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={formData.mapLink}
                  onChange={(e) => updateField('mapLink', e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="flex-1"
                />
                {formData.mapLink && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(formData.mapLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Make</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3"
                  value={formData.carMakeId || ''}
                  onChange={(e) => {
                    updateField('carMakeId', e.target.value);
                    updateField('carModelId', '');
                  }}
                >
                  <option value="">Select make...</option>
                  {carMakes.map((make: any) => (
                    <option key={make.id} value={make.id}>{make.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3"
                  value={formData.carModelId || ''}
                  onChange={(e) => updateField('carModelId', e.target.value)}
                  disabled={!formData.carMakeId}
                >
                  <option value="">Select model...</option>
                  {carModels.map((model: any) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <Input
                  value={formData.carColor}
                  onChange={(e) => updateField('carColor', e.target.value)}
                  placeholder="Black"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispatcher Message */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dispatcher Message</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
              value={formData.dispatcherMessage}
              onChange={(e) => updateField('dispatcherMessage', e.target.value)}
              placeholder="Additional notes for responders..."
            />
          </CardContent>
        </Card>

        {/* Action buttons - fixed at bottom on mobile */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white border-t p-4 md:relative md:border-0 md:p-0 md:bg-transparent">
          <div className="flex gap-2 max-w-4xl mx-auto">
            {isEditing && existingCall?.status === 'active' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyBroadcast}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  type="button"
                  onClick={handleBroadcast}
                  disabled={broadcastMutation.isPending}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Broadcast
                </Button>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </>
            )}
            
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className={cn(!isEditing && 'flex-1')}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Save' : 'Create Call'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
