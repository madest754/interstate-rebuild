/**
 * LocationPicker Component
 * 
 * Tabbed interface for selecting location by:
 * - Highway (highway, direction, exits, mile marker)
 * - Address (street address with Google Places autocomplete)
 * - Free Text (manual entry)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Route, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, type SelectOption } from './ui/select';
import { Button } from './ui/button';
import { useHighways, useHighwayExits, type Highway, type HighwayExit } from '../hooks';

export type LocationType = 'highway' | 'address' | 'freetext';

export interface LocationData {
  type: LocationType;
  
  // Highway fields
  highwayId?: string;
  customHighway?: string;
  direction?: string;
  localExpress?: string;
  betweenExit?: string;
  andExit?: string;
  mileMarker?: string;
  
  // Address fields
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Free text
  freeTextLocation?: string;
  
  // Common fields
  mapLink?: string;
  latitude?: string;
  longitude?: string;
}

interface LocationPickerProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  disabled?: boolean;
  className?: string;
  showMapLink?: boolean;
}

export function LocationPicker({
  value,
  onChange,
  disabled = false,
  className,
  showMapLink = true,
}: LocationPickerProps) {
  const [activeTab, setActiveTab] = useState<LocationType>(value.type || 'highway');

  // Update parent when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as LocationType);
    onChange({ ...value, type: tab as LocationType });
  };

  // Update field
  const updateField = useCallback((field: keyof LocationData, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  }, [value, onChange]);

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="highway" disabled={disabled}>
            <Route className="h-4 w-4 mr-2" />
            Highway
          </TabsTrigger>
          <TabsTrigger value="address" disabled={disabled}>
            <MapPin className="h-4 w-4 mr-2" />
            Address
          </TabsTrigger>
          <TabsTrigger value="freetext" disabled={disabled}>
            <FileText className="h-4 w-4 mr-2" />
            Free Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="highway" className="space-y-4">
          <HighwayLocationForm 
            value={value} 
            onChange={onChange} 
            disabled={disabled}
          />
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          <AddressLocationForm 
            value={value} 
            onChange={onChange} 
            disabled={disabled}
          />
        </TabsContent>

        <TabsContent value="freetext" className="space-y-4">
          <FreeTextLocationForm 
            value={value} 
            onChange={onChange} 
            disabled={disabled}
          />
        </TabsContent>
      </Tabs>

      {/* Map Link & Coordinates */}
      {showMapLink && (
        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-2">
            <Label htmlFor="mapLink">Google Maps Link</Label>
            <div className="flex gap-2">
              <Input
                id="mapLink"
                placeholder="https://maps.google.com/..."
                value={value.mapLink || ''}
                onChange={(e) => updateField('mapLink', e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
              {value.mapLink && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a href={value.mapLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                placeholder="40.0583"
                value={value.latitude || ''}
                onChange={(e) => updateField('latitude', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                placeholder="-74.4057"
                value={value.longitude || ''}
                onChange={(e) => updateField('longitude', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Highway Location Form
 */
interface HighwayLocationFormProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  disabled?: boolean;
}

function HighwayLocationForm({ value, onChange, disabled }: HighwayLocationFormProps) {
  const { data: highways, isLoading: loadingHighways } = useHighways();
  const { data: exits } = useHighwayExits(value.highwayId);

  const updateField = (field: keyof LocationData, fieldValue: string) => {
    const updates: Partial<LocationData> = { [field]: fieldValue };
    
    // Clear exits when highway changes
    if (field === 'highwayId') {
      updates.betweenExit = '';
      updates.andExit = '';
    }
    
    onChange({ ...value, ...updates });
  };

  // Convert highways to select options
  const highwayOptions: SelectOption[] = highways?.map(h => ({
    value: h.id,
    label: h.name,
  })) || [];

  // Direction options
  const directionOptions: SelectOption[] = [
    { value: 'North', label: 'Northbound' },
    { value: 'South', label: 'Southbound' },
    { value: 'East', label: 'Eastbound' },
    { value: 'West', label: 'Westbound' },
  ];

  // Local/Express options
  const localExpressOptions: SelectOption[] = [
    { value: '', label: 'N/A' },
    { value: 'Local', label: 'Local' },
    { value: 'Express', label: 'Express' },
  ];

  // Exit options
  const exitOptions: SelectOption[] = exits?.map(e => ({
    value: e.exitNumber,
    label: e.exitName ? `${e.exitNumber} - ${e.exitName}` : e.exitNumber,
  })) || [];

  return (
    <div className="space-y-4">
      {/* Highway Selection */}
      <div className="space-y-2">
        <Label htmlFor="highway">Highway *</Label>
        <Select
          value={value.highwayId || ''}
          onValueChange={(v) => updateField('highwayId', v)}
          options={highwayOptions}
          placeholder={loadingHighways ? 'Loading...' : 'Select highway...'}
          disabled={disabled}
        />
        <Input
          placeholder="Or enter custom highway name..."
          value={value.customHighway || ''}
          onChange={(e) => updateField('customHighway', e.target.value)}
          disabled={disabled}
          className="mt-2"
        />
      </div>

      {/* Direction & Local/Express */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="direction">Direction</Label>
          <Select
            value={value.direction || ''}
            onValueChange={(v) => updateField('direction', v)}
            options={directionOptions}
            placeholder="Select..."
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="localExpress">Local/Express</Label>
          <Select
            value={value.localExpress || ''}
            onValueChange={(v) => updateField('localExpress', v)}
            options={localExpressOptions}
            placeholder="Select..."
            disabled={disabled}
          />
        </div>
      </div>

      {/* Exits */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="betweenExit">Between Exit</Label>
          {exitOptions.length > 0 ? (
            <Select
              value={value.betweenExit || ''}
              onValueChange={(v) => updateField('betweenExit', v)}
              options={exitOptions}
              placeholder="Select exit..."
              disabled={disabled}
            />
          ) : (
            <Input
              placeholder="Exit number..."
              value={value.betweenExit || ''}
              onChange={(e) => updateField('betweenExit', e.target.value)}
              disabled={disabled}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="andExit">And Exit</Label>
          {exitOptions.length > 0 ? (
            <Select
              value={value.andExit || ''}
              onValueChange={(v) => updateField('andExit', v)}
              options={exitOptions}
              placeholder="Select exit..."
              disabled={disabled}
            />
          ) : (
            <Input
              placeholder="Exit number..."
              value={value.andExit || ''}
              onChange={(e) => updateField('andExit', e.target.value)}
              disabled={disabled}
            />
          )}
        </div>
      </div>

      {/* Mile Marker */}
      <div className="space-y-2">
        <Label htmlFor="mileMarker">Mile Marker</Label>
        <Input
          id="mileMarker"
          placeholder="e.g., 105.5"
          value={value.mileMarker || ''}
          onChange={(e) => updateField('mileMarker', e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

/**
 * Address Location Form
 */
function AddressLocationForm({ value, onChange, disabled }: HighwayLocationFormProps) {
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const updateField = (field: keyof LocationData, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  // State options
  const stateOptions: SelectOption[] = [
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NY', label: 'New York' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'MD', label: 'Maryland' },
  ];

  // TODO: Integrate Google Places Autocomplete
  // For now, just manual entry

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Street Address *</Label>
        <Input
          ref={inputRef}
          id="address"
          placeholder="123 Main Street..."
          value={value.address || ''}
          onChange={(e) => updateField('address', e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Start typing for suggestions (Google Places integration)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2 col-span-1">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="Lakewood"
            value={value.city || ''}
            onChange={(e) => updateField('city', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2 col-span-1">
          <Label htmlFor="state">State</Label>
          <Select
            value={value.state || ''}
            onValueChange={(v) => updateField('state', v)}
            options={stateOptions}
            placeholder="Select..."
            disabled={disabled}
          />
        </div>
        <div className="space-y-2 col-span-1">
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            placeholder="08701"
            value={value.zip || ''}
            onChange={(e) => updateField('zip', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Free Text Location Form
 */
function FreeTextLocationForm({ value, onChange, disabled }: HighwayLocationFormProps) {
  const updateField = (field: keyof LocationData, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="freeTextLocation">Location Description *</Label>
        <Textarea
          id="freeTextLocation"
          placeholder="Enter the location description...&#10;e.g., Parking lot behind Shop Rite on Route 9, near the dumpsters"
          value={value.freeTextLocation || ''}
          onChange={(e) => updateField('freeTextLocation', e.target.value)}
          disabled={disabled}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Provide as much detail as possible for responders to find the location.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact location display for read-only contexts
 */
interface LocationDisplayProps {
  location: LocationData;
  showLink?: boolean;
  className?: string;
}

export function LocationDisplay({ location, showLink = true, className }: LocationDisplayProps) {
  const { data: highways } = useHighways();

  const locationString = React.useMemo(() => {
    if (location.freeTextLocation) {
      return location.freeTextLocation;
    }
    
    if (location.highwayId || location.customHighway) {
      const parts = [];
      
      if (location.highwayId && highways) {
        const highway = highways.find(h => h.id === location.highwayId);
        parts.push(highway?.name || 'Highway');
      } else if (location.customHighway) {
        parts.push(location.customHighway);
      }
      
      if (location.direction) parts.push(location.direction);
      if (location.localExpress) parts.push(location.localExpress);
      
      if (location.betweenExit && location.andExit) {
        parts.push(`Exit ${location.betweenExit} - ${location.andExit}`);
      } else if (location.mileMarker) {
        parts.push(`MM ${location.mileMarker}`);
      }
      
      return parts.join(' • ');
    }
    
    if (location.address) {
      const parts = [location.address];
      if (location.city) parts.push(location.city);
      if (location.state) parts.push(location.state);
      if (location.zip) parts.push(location.zip);
      return parts.join(', ');
    }
    
    return 'No location specified';
  }, [location, highways]);

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <span className="text-sm">{locationString}</span>
      {showLink && location.mapLink && (
        <a 
          href={location.mapLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 flex-shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

export default LocationPicker;
