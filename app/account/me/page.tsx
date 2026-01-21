import { MyProfileClient } from "@/components/my-profile-client";

/**
 * My Profile Page - Server Component wrapper
 *
 * This page requires client-side authentication (useAuth hook),
 * so the actual content is rendered in MyProfileClient.
 *
 * Optimizations applied:
 * - Mock data extracted to lib/data/suggestions.ts
 * - AutocompleteInput extracted to components/ui/autocomplete-input.tsx
 * - EditProfileModal lazy loaded with dynamic import
 * - All handlers memoized with useCallback
 * - Lists memoized with useMemo
 */
export default function MyProfilePage() {
  return <MyProfileClient />;
}
