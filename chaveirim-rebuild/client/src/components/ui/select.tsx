/**
 * Select Component
 * 
 * Styled select dropdown using Radix UI primitives.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
  id,
  name,
  required,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const option = options[highlightedIndex];
          if (!option.disabled) {
            handleSelect(option.value);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input type="hidden" name={name} value={value || ''} />
      
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selectedOption && 'text-muted-foreground'
        )}
      >
        <span className="truncate">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn(
          'h-4 w-4 opacity-50 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className={cn(
            'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md',
            'animate-in fade-in-0 zoom-in-95'
          )}
        >
          {options.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              No options available
            </li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                onClick={() => !option.disabled && handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                  option.value === value && 'font-medium',
                  highlightedIndex === index && 'bg-accent text-accent-foreground',
                  option.disabled && 'pointer-events-none opacity-50'
                )}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="ml-2 h-4 w-4" />
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Native select for simpler use cases
 */
interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export function NativeSelect({
  options,
  placeholder,
  className,
  ...props
}: NativeSelectProps) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map(option => (
        <option 
          key={option.value} 
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
