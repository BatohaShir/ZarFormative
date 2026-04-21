"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  className?: string;
  /** Controlled value — when provided, component reflects this value. */
  value?: string;
  /** Called when user types — if provided, internal state is not used. */
  onValueChange?: (v: string) => void;
  /** Called on Enter / submit with the current trimmed value. */
  onSubmit?: (v: string) => void;
  /** Show a submit button on the right. */
  showSubmit?: boolean;
  /** Label for the submit button. */
  submitLabel?: string;
  placeholder?: string;
}

export const SearchInput = React.memo(function SearchInput({
  className,
  value,
  onValueChange,
  onSubmit,
  showSubmit = false,
  submitLabel = "Хайх",
  placeholder = "Танд юу хэрэгтэй вэ?",
}: SearchInputProps) {
  const [internalQuery, setInternalQuery] = React.useState("");
  const isControlled = value !== undefined;
  const query = isControlled ? value : internalQuery;

  const setQuery = React.useCallback(
    (next: string) => {
      if (onValueChange) onValueChange(next);
      if (!isControlled) setInternalQuery(next);
    },
    [onValueChange, isControlled]
  );

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit?.(query.trim());
    },
    [onSubmit, query]
  );

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center gap-2 ${className || ""}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={placeholder}
          className={showSubmit ? "pl-10 pr-9" : "pl-10"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onSubmit?.("");
            }}
            aria-label="Цэвэрлэх"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showSubmit && (
        <button
          type="submit"
          className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all shrink-0"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
});
