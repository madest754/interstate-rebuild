/**
 * Checkbox Component
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            'h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            'peer-checked:bg-primary peer-checked:text-primary-foreground',
            'flex items-center justify-center',
            className
          )}
        >
          {checked && <Check className="h-3 w-3" />}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

/**
 * Checkbox with label
 */
interface CheckboxWithLabelProps extends CheckboxProps {
  label: string;
  description?: string;
}

export function CheckboxWithLabel({ 
  label, 
  description, 
  id,
  className,
  ...props 
}: CheckboxWithLabelProps) {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  return (
    <div className={cn('flex items-start space-x-3', className)}>
      <Checkbox id={checkboxId} {...props} />
      <div className="grid gap-1.5 leading-none">
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
