"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Loader2 } from "lucide-react";

interface PriceProposalModalProps {
  listingTitle: string;
  onSubmit: (price: number) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export const PriceProposalModal = React.memo(function PriceProposalModal({
  listingTitle,
  onSubmit,
  onClose,
  isSubmitting,
}: PriceProposalModalProps) {
  const [priceValue, setPriceValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const price = parseFloat(priceValue);
      if (price > 0) {
        onSubmit(price);
      }
    },
    [onSubmit, priceValue]
  );

  const price = parseFloat(priceValue) || 0;
  const isValidPrice = price > 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-200 flex items-center justify-center p-4">
      <div
        className="bg-background w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-linear-to-r from-purple-600 to-violet-600 px-5 py-4 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="pr-10">
            <h3 className="font-semibold text-lg">Үнэ санал болгох</h3>
            <p className="text-sm text-white/80 line-clamp-1 mt-0.5">{listingTitle}</p>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-muted-foreground mb-2">
              Үйлчилгээний үнэ
            </label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="price"
                type="number"
                placeholder="0"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                className="h-14 text-2xl font-semibold pr-14 text-center"
                min="0"
                step="1000"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                ₮
              </span>
            </div>
          </div>

          {/* Quick price buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[10000, 25000, 50000, 100000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setPriceValue(amount.toString())}
                className="px-2 py-2 text-xs font-medium rounded-lg border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
              >
                {(amount / 1000).toFixed(0)}K
              </button>
            ))}
          </div>

          {/* Preview */}
          {isValidPrice && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-center text-purple-700 dark:text-purple-300">
                Таны санал болгох үнэ:{" "}
                <span className="font-bold text-lg">{price.toLocaleString()}₮</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Болих
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting || !isValidPrice}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Илгээх
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});
