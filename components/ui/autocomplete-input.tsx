"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly string[] | string[];
  placeholder: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Input with autocomplete suggestions dropdown
 * Memoized to prevent unnecessary re-renders
 */
export const AutocompleteInput = React.memo(function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  disabled,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Filter suggestions based on input value
  React.useEffect(() => {
    if (value.length > 0) {
      const filtered = (suggestions as string[])
        .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0 && !suggestions.includes(value));
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleFocus = React.useCallback(() => {
    if (filteredSuggestions.length > 0 && !suggestions.includes(value)) {
      setIsOpen(true);
    }
  }, [filteredSuggestions.length, suggestions, value]);

  const handleSuggestionClick = React.useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        onFocus={handleFocus}
        disabled={disabled}
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                "focus:outline-none focus:bg-muted"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

AutocompleteInput.displayName = "AutocompleteInput";
