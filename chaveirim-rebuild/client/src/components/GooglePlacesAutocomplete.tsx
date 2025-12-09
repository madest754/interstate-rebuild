/**
 * GooglePlacesAutocomplete Component
 * 
 * Address input with Google Places autocomplete.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface PlaceResult {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  restrictToUS?: boolean;
}

// Declare Google types
declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}

let googleScriptLoaded = false;
let googleScriptLoading = false;
const loadCallbacks: (() => void)[] = [];

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address...',
  disabled = false,
  className,
  restrictToUS = true,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(googleScriptLoaded);

  // Load Google Places script
  useEffect(() => {
    if (googleScriptLoaded) {
      setIsScriptLoaded(true);
      return;
    }

    if (googleScriptLoading) {
      loadCallbacks.push(() => setIsScriptLoaded(true));
      return;
    }

    // Check if API key is available
    const loadScript = async () => {
      try {
        const response = await fetch('/api/config/google-places');
        const config = await response.json();
        
        if (!config.apiKey) {
          console.warn('Google Places API key not configured');
          return;
        }

        googleScriptLoading = true;

        // Create callback
        window.initGooglePlaces = () => {
          googleScriptLoaded = true;
          googleScriptLoading = false;
          setIsScriptLoaded(true);
          loadCallbacks.forEach(cb => cb());
          loadCallbacks.length = 0;
        };

        // Load script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=places&callback=initGooglePlaces`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load Google Places:', error);
      }
    };

    loadScript();
  }, []);

  // Initialize autocomplete when script loads
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    try {
      const options: any = {
        fields: ['address_components', 'geometry', 'place_id', 'formatted_address'],
        types: ['address'],
      };

      if (restrictToUS) {
        options.componentRestrictions = { country: 'us' };
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        
        if (!place.geometry) {
          console.warn('No geometry for place');
          return;
        }

        const result = parseGooglePlace(place);
        onPlaceSelect(result);
        onChange(result.formattedAddress);
      });
    } catch (error) {
      console.error('Failed to initialize Google Places:', error);
    }
  }, [isScriptLoaded, onPlaceSelect, onChange, restrictToUS]);

  // Handle clear
  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || !isScriptLoaded}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {!isScriptLoaded && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

/**
 * Parse Google Place result into our format
 */
function parseGooglePlace(place: any): PlaceResult {
  const components = place.address_components || [];
  
  const getComponent = (type: string): string => {
    const comp = components.find((c: any) => c.types.includes(type));
    return comp?.long_name || '';
  };

  const getShortComponent = (type: string): string => {
    const comp = components.find((c: any) => c.types.includes(type));
    return comp?.short_name || '';
  };

  // Build street address
  const streetNumber = getComponent('street_number');
  const streetName = getComponent('route');
  const address = [streetNumber, streetName].filter(Boolean).join(' ');

  return {
    address,
    city: getComponent('locality') || getComponent('sublocality'),
    state: getShortComponent('administrative_area_level_1'),
    zip: getComponent('postal_code'),
    country: getShortComponent('country'),
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
    placeId: place.place_id,
    formattedAddress: place.formatted_address,
  };
}

/**
 * Simple address input fallback when Google Places is not available
 */
interface ManualAddressInputProps {
  address: string;
  city: string;
  state: string;
  zip: string;
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

export function ManualAddressInput({
  address,
  city,
  state,
  zip,
  onChange,
  disabled = false,
}: ManualAddressInputProps) {
  const states = [
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NY', label: 'New York' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'MD', label: 'Maryland' },
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Street address"
          value={address}
          onChange={(e) => onChange('address', e.target.value)}
          disabled={disabled}
          className="pl-10"
        />
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => onChange('city', e.target.value)}
          disabled={disabled}
        />
        <select
          value={state}
          onChange={(e) => onChange('state', e.target.value)}
          disabled={disabled}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">State</option>
          {states.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Input
          placeholder="ZIP"
          value={zip}
          onChange={(e) => onChange('zip', e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default GooglePlacesAutocomplete;
