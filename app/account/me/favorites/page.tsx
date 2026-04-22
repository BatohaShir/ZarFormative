import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFavoritesPageData } from "@/lib/favorites/query";
import { FavoritesClient } from "./_components/favorites-client";

// Dynamic: the result depends on the logged-in user. Caching would leak
// one user's favorites to another.
export const revalidate = 0;

export default async function FavoritesPage() {
  // Read session on the server so the page can ship the list in its
  // initial HTML instead of waiting for a client-side findMany after
  // hydration. Previously we were dynamic(ssr:false), so the user
  // stared at a skeleton for ~4s (two sequential ZenStack REST trips)
  // before cards rendered.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects anon users here, but belt-and-braces:
  // if somebody bypasses the matcher we still land them on the auth
  // prompt instead of SSR'ing an empty grid.
  if (!user) {
    redirect("/?auth=required&redirect=/account/me/favorites");
  }

  const favorites = await fetchFavoritesPageData(user.id);

  return <FavoritesClient initialFavorites={favorites} />;
}
