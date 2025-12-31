import { renderHook, act } from "@testing-library/react";
import { FavoritesProvider, useFavorites } from "@/contexts/favorites-context";

describe("FavoritesContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FavoritesProvider>{children}</FavoritesProvider>
  );

  it("should initialize with empty favorites", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(result.current.favorites).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("should add a favorite", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => {
      result.current.toggleFavorite(1);
    });

    expect(result.current.favorites).toContain(1);
    expect(result.current.count).toBe(1);
    expect(result.current.isFavorite(1)).toBe(true);
  });

  it("should remove a favorite", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => {
      result.current.toggleFavorite(1);
    });

    expect(result.current.isFavorite(1)).toBe(true);

    act(() => {
      result.current.toggleFavorite(1);
    });

    expect(result.current.isFavorite(1)).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("should handle multiple favorites", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => {
      result.current.toggleFavorite(1);
      result.current.toggleFavorite(2);
      result.current.toggleFavorite(3);
    });

    expect(result.current.favorites).toEqual([1, 2, 3]);
    expect(result.current.count).toBe(3);
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useFavorites());
    }).toThrow("useFavorites must be used within a FavoritesProvider");

    spy.mockRestore();
  });
});
