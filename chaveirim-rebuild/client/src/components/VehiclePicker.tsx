/**
 * VehiclePicker Component
 * 
 * Select vehicle make, model, and color with optional custom entry.
 */

import React, { useMemo } from 'react';
import { Car, Palette } from 'lucide-react';
import { cn } from '../lib/utils';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, type SelectOption } from './ui/select';
import { useCarMakes, useCarModels } from '../hooks';

export interface VehicleData {
  carMakeId?: string;
  carModelId?: string;
  carColor?: string;
  customVehicle?: string;
  vehicleComment?: string;
}

interface VehiclePickerProps {
  value: VehicleData;
  onChange: (data: VehicleData) => void;
  disabled?: boolean;
  className?: string;
  showComment?: boolean;
  required?: boolean;
}

// Common vehicle colors
const COLOR_OPTIONS: SelectOption[] = [
  { value: 'Black', label: 'Black' },
  { value: 'White', label: 'White' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Gray', label: 'Gray' },
  { value: 'Red', label: 'Red' },
  { value: 'Blue', label: 'Blue' },
  { value: 'Navy', label: 'Navy Blue' },
  { value: 'Green', label: 'Green' },
  { value: 'Brown', label: 'Brown' },
  { value: 'Tan', label: 'Tan/Beige' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Orange', label: 'Orange' },
  { value: 'Yellow', label: 'Yellow' },
  { value: 'Purple', label: 'Purple' },
  { value: 'Maroon', label: 'Maroon' },
  { value: 'Other', label: 'Other' },
];

export function VehiclePicker({
  value,
  onChange,
  disabled = false,
  className,
  showComment = true,
  required = false,
}: VehiclePickerProps) {
  // Fetch makes and models
  const { data: makes, isLoading: loadingMakes } = useCarMakes();
  const { data: models, isLoading: loadingModels } = useCarModels(value.carMakeId);

  // Update field
  const updateField = (field: keyof VehicleData, fieldValue: string) => {
    const updates: Partial<VehicleData> = { [field]: fieldValue };
    
    // Clear model when make changes
    if (field === 'carMakeId') {
      updates.carModelId = '';
    }
    
    onChange({ ...value, ...updates });
  };

  // Convert makes to select options
  const makeOptions: SelectOption[] = useMemo(() => {
    return makes?.map(m => ({
      value: m.id,
      label: m.name,
    })) || [];
  }, [makes]);

  // Convert models to select options
  const modelOptions: SelectOption[] = useMemo(() => {
    return models?.map(m => ({
      value: m.id,
      label: m.name,
    })) || [];
  }, [models]);

  // Check if using custom vehicle
  const isUsingCustom = !!value.customVehicle && !value.carMakeId;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Standard Vehicle Selection */}
      <div className="grid grid-cols-3 gap-3">
        {/* Make */}
        <div className="space-y-2">
          <Label htmlFor="carMake">Make {required && '*'}</Label>
          <Select
            value={value.carMakeId || ''}
            onValueChange={(v) => updateField('carMakeId', v)}
            options={makeOptions}
            placeholder={loadingMakes ? 'Loading...' : 'Select make...'}
            disabled={disabled || isUsingCustom}
          />
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label htmlFor="carModel">Model</Label>
          <Select
            value={value.carModelId || ''}
            onValueChange={(v) => updateField('carModelId', v)}
            options={modelOptions}
            placeholder={
              !value.carMakeId 
                ? 'Select make first' 
                : loadingModels 
                  ? 'Loading...' 
                  : 'Select model...'
            }
            disabled={disabled || !value.carMakeId || isUsingCustom}
          />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label htmlFor="carColor">Color</Label>
          <Select
            value={value.carColor || ''}
            onValueChange={(v) => updateField('carColor', v)}
            options={COLOR_OPTIONS}
            placeholder="Select color..."
            disabled={disabled}
          />
        </div>
      </div>

      {/* Custom Vehicle Entry */}
      <div className="space-y-2">
        <Label htmlFor="customVehicle">
          Or describe vehicle manually
        </Label>
        <Input
          id="customVehicle"
          placeholder="e.g., White Honda Odyssey minivan, license plate ABC1234"
          value={value.customVehicle || ''}
          onChange={(e) => updateField('customVehicle', e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Use this field for vehicles not in the list or to add license plate info
        </p>
      </div>

      {/* Additional Comment */}
      {showComment && (
        <div className="space-y-2">
          <Label htmlFor="vehicleComment">Vehicle Notes</Label>
          <Textarea
            id="vehicleComment"
            placeholder="Additional details about the vehicle (damage, identifying features, etc.)"
            value={value.vehicleComment || ''}
            onChange={(e) => updateField('vehicleComment', e.target.value)}
            disabled={disabled}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Compact vehicle display
 */
interface VehicleDisplayProps {
  vehicle: VehicleData;
  className?: string;
}

export function VehicleDisplay({ vehicle, className }: VehicleDisplayProps) {
  const { data: makes } = useCarMakes();
  const { data: models } = useCarModels(vehicle.carMakeId);

  const vehicleString = useMemo(() => {
    if (vehicle.customVehicle) {
      return vehicle.customVehicle;
    }

    const parts: string[] = [];
    
    if (vehicle.carColor) {
      parts.push(vehicle.carColor);
    }
    
    if (vehicle.carMakeId && makes) {
      const make = makes.find(m => m.id === vehicle.carMakeId);
      if (make) parts.push(make.name);
    }
    
    if (vehicle.carModelId && models) {
      const model = models.find(m => m.id === vehicle.carModelId);
      if (model) parts.push(model.name);
    }

    return parts.length > 0 ? parts.join(' ') : 'No vehicle specified';
  }, [vehicle, makes, models]);

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <Car className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-sm">{vehicleString}</span>
        {vehicle.vehicleComment && (
          <p className="text-xs text-muted-foreground mt-1">
            {vehicle.vehicleComment}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Quick vehicle entry - single field with fuzzy matching
 */
interface QuickVehicleEntryProps {
  value: string;
  onChange: (value: string) => void;
  onParsed?: (data: VehicleData) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickVehicleEntry({
  value,
  onChange,
  onParsed,
  disabled = false,
  className,
}: QuickVehicleEntryProps) {
  // TODO: Implement fuzzy matching API call
  // For now, just a simple text input

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="quickVehicle">Vehicle Description</Label>
      <Input
        id="quickVehicle"
        placeholder="e.g., White Honda Accord"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        Type naturally - we'll try to match the make, model, and color
      </p>
    </div>
  );
}

/**
 * Color picker with visual swatches
 */
interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
}

const COLOR_SWATCHES = [
  { name: 'Black', color: '#000000' },
  { name: 'White', color: '#FFFFFF' },
  { name: 'Silver', color: '#C0C0C0' },
  { name: 'Gray', color: '#808080' },
  { name: 'Red', color: '#FF0000' },
  { name: 'Blue', color: '#0000FF' },
  { name: 'Navy', color: '#000080' },
  { name: 'Green', color: '#008000' },
  { name: 'Brown', color: '#8B4513' },
  { name: 'Tan', color: '#D2B48C' },
  { name: 'Gold', color: '#FFD700' },
  { name: 'Orange', color: '#FFA500' },
  { name: 'Yellow', color: '#FFFF00' },
  { name: 'Purple', color: '#800080' },
  { name: 'Maroon', color: '#800000' },
];

export function ColorPicker({
  value,
  onChange,
  disabled = false,
  className,
}: ColorPickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>Color</Label>
      <div className="flex flex-wrap gap-2">
        {COLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch.name}
            type="button"
            onClick={() => onChange(swatch.name)}
            disabled={disabled}
            className={cn(
              'w-8 h-8 rounded-full border-2 transition-all',
              value === swatch.name 
                ? 'border-primary ring-2 ring-primary ring-offset-2' 
                : 'border-gray-300 hover:border-gray-400',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{ backgroundColor: swatch.color }}
            title={swatch.name}
          />
        ))}
      </div>
      {value && (
        <p className="text-sm text-muted-foreground">
          Selected: {value}
        </p>
      )}
    </div>
  );
}

export default VehiclePicker;
