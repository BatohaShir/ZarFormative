import { renderHook } from "@testing-library/react";
import { FavoritesProvider, useFavorites } from "@/contexts/favorites-context";

// Mock the hooks and contexts
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    setQueriesData: jest.fn(),
  }),
  useQuery: () => ({
    data: [],
    isLoading: false,
  }),
  useMutation: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

// The oRPC client is mocked rather than imported: @orpc/* ships ESM
// only, which Jest's CJS runtime cannot parse. Only `.key()` and the
// option builders are reachable from this context — the mock returns
// whatever the mocked useQuery/useMutation above ignore anyway.
jest.mock("@/lib/orpc/client", () => {
  const procedure = {
    key: () => ["favorites"],
    queryOptions: (opts: unknown) => opts,
    mutationOptions: (opts: unknown) => opts,
  };
  return {
    orpc: {
      favorites: {
        key: () => ["favorites"],
        ids: procedure,
        list: procedure,
        add: procedure,
        remove: procedure,
      },
    },
  };
});

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
    }).toThrow("must be used within a FavoritesProvider");

    spy.mockRestore();
  });
});
