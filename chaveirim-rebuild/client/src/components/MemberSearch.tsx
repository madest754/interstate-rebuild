/**
 * MemberSearch Component
 * 
 * Searchable dropdown for selecting members.
 * Used for assigning members to calls and other selections.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, User, Phone, X, Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useMemberSearch, useMembers, type Member } from '../hooks';

interface MemberSearchProps {
  value?: string; // member ID
  onSelect: (member: Member | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filterDispatchersOnly?: boolean;
  filterCoordinatorsOnly?: boolean;
  excludeIds?: string[];
}

export function MemberSearch({
  value,
  onSelect,
  placeholder = 'Search members...',
  disabled = false,
  className,
  filterDispatchersOnly = false,
  filterCoordinatorsOnly = false,
  excludeIds = [],
}: MemberSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Fetch members based on search
  const { data: searchResults, isLoading } = useMemberSearch(query);
  const { data: allMembers } = useMembers();

  // Find selected member
  const selectedMember = allMembers?.find(m => m.id === value);

  // Filter results
  const filteredResults = React.useMemo(() => {
    let results = query.length >= 2 ? searchResults : allMembers?.slice(0, 20);
    
    if (!results) return [];

    // Apply filters
    if (filterDispatchersOnly) {
      results = results.filter(m => m.isDispatcher);
    }
    if (filterCoordinatorsOnly) {
      results = results.filter(m => m.isCoordinator);
    }
    if (excludeIds.length > 0) {
      results = results.filter(m => !excludeIds.includes(m.id));
    }

    return results;
  }, [searchResults, allMembers, query, filterDispatchersOnly, filterCoordinatorsOnly, excludeIds]);

  // Handle selection
  const handleSelect = useCallback((member: Member) => {
    onSelect(member);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onSelect]);

  // Handle clear
  const handleClear = useCallback(() => {
    onSelect(null);
    setQuery('');
  }, [onSelect]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredResults[highlightedIndex]) {
          handleSelect(filteredResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
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
      {/* Selected Member Display */}
      {selectedMember && !isOpen ? (
        <div className="flex items-center justify-between gap-2 h-10 px-3 py-2 rounded-md border border-input bg-background">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{selectedMember.unitNumber}</span>
            <span className="text-muted-foreground truncate">
              {selectedMember.firstName} {selectedMember.lastName}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="pl-10 pr-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !selectedMember && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {filteredResults.length === 0 ? (
            <li className="px-2 py-3 text-sm text-center text-muted-foreground">
              {query.length < 2 
                ? 'Type to search...' 
                : isLoading 
                  ? 'Searching...' 
                  : 'No members found'}
            </li>
          ) : (
            filteredResults.map((member, index) => (
              <li
                key={member.id}
                onClick={() => handleSelect(member)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'flex items-center justify-between gap-2 px-2 py-2 rounded-sm cursor-pointer',
                  highlightedIndex === index && 'bg-accent text-accent-foreground'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{member.unitNumber}</span>
                  <span className="text-muted-foreground truncate">
                    {member.firstName} {member.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {member.isDispatcher && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">D</span>
                  )}
                  {member.isCoordinator && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">C</span>
                  )}
                  {value === member.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Multi-select version for assigning multiple members
 */
interface MemberMultiSelectProps {
  value: string[]; // member IDs
  onChange: (memberIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelections?: number;
}

export function MemberMultiSelect({
  value,
  onChange,
  placeholder = 'Add members...',
  disabled = false,
  className,
  maxSelections,
}: MemberMultiSelectProps) {
  const { data: allMembers } = useMembers();

  // Get selected member objects
  const selectedMembers = allMembers?.filter(m => value.includes(m.id)) || [];

  const handleAdd = (member: Member | null) => {
    if (!member) return;
    if (maxSelections && value.length >= maxSelections) return;
    if (!value.includes(member.id)) {
      onChange([...value, member.id]);
    }
  };

  const handleRemove = (memberId: string) => {
    onChange(value.filter(id => id !== memberId));
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected Members */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map(member => (
            <div
              key={member.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
            >
              <span className="font-medium">{member.unitNumber}</span>
              <span className="text-muted-foreground">
                {member.firstName} {member.lastName}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(member.id)}
                className="ml-1 hover:text-destructive"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add More */}
      {(!maxSelections || value.length < maxSelections) && (
        <MemberSearch
          onSelect={handleAdd}
          placeholder={placeholder}
          disabled={disabled}
          excludeIds={value}
        />
      )}
    </div>
  );
}

/**
 * Compact member display for read-only contexts
 */
interface MemberBadgeProps {
  member: Member;
  onRemove?: () => void;
  showPhone?: boolean;
}

export function MemberBadge({ member, onRemove, showPhone = false }: MemberBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-sm">
      <User className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{member.unitNumber}</span>
      <span className="text-muted-foreground">
        {member.firstName} {member.lastName}
      </span>
      {showPhone && (
        <a href={`tel:${member.phone}`} className="text-blue-600 hover:underline">
          <Phone className="h-3 w-3" />
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default MemberSearch;
