"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
}

export const AutocompleteInput = React.memo(function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (value.length > 0) {
      const filtered = suggestions
        .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0 && !suggestions.includes(value));
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = React.useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        onFocus={() => {
          if (filteredSuggestions.length > 0 && !suggestions.includes(value)) {
            setIsOpen(true);
          }
        }}
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
