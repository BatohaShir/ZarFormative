import { renderHook } from "@testing-library/react";
import { FavoritesProvider, useFavorites } from "@/contexts/favorites-context";

// Mock the hooks and contexts
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

jest.mock("@/lib/hooks/user-favorites", () => ({
  useFindManyuser_favorites: () => ({
    data: [],
    isLoading: false,
  }),
  useCreateuser_favorites: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDeleteuser_favorites: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

describe("FavoritesContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FavoritesProvider>{children}</FavoritesProvider>
  );

  it("should initialize with empty favorites for guest", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(result.current.favorites).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("should check if item is not favorite", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(result.current.isFavorite("test-id")).toBe(false);
  });

  it("should have toggleFavorite function", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(typeof result.current.toggleFavorite).toBe("function");
  });

  it("should have isToggling state", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(result.current.isToggling).toBe(false);
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
