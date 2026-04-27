import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchMyProfileData } from "@/lib/profile/my-profile-query";
import { MyProfileClient } from "@/components/my-profile-client";

// This page depends on the signed-in user — can't be shared across
// users, so no caching.
export const revalidate = 0;

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware should already redirect anon users to the home page,
  // but belt-and-braces.
  if (!user) {
    redirect("/?auth=required&redirect=/account/me");
  }

  // Single CTE round-trip: profile + educations + work. Client hook
  // receives this as initialData so the UI paints on first render
  // instead of waiting three sequential ZenStack REST calls.
  // ssrUserId is passed separately so the seed hashes the hook's
  // args on first render — without waiting for the client-side
  // Supabase auth singleton to hydrate.
  const ssrData = await fetchMyProfileData(user.id);

  return <MyProfileClient ssrData={ssrData} ssrUserId={user.id} />;
}
