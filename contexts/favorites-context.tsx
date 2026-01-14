"use client";

import * as React from "react";

interface FavoritesContextType {
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  count: number;
}

const FavoritesContext = React.createContext<FavoritesContextType | undefined>(
  undefined
);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  // Use Set for O(1) lookup instead of Array O(n)
  const [favorites, setFavorites] = React.useState<Set<number>>(new Set());

  const toggleFavorite = React.useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // O(1) lookup with Set.has()
  const isFavorite = React.useCallback((id: number) => favorites.has(id), [favorites]);

  const count = favorites.size;

  const value = React.useMemo(
    () => ({ favorites, toggleFavorite, isFavorite, count }),
    [favorites, toggleFavorite, isFavorite, count]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = React.useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
