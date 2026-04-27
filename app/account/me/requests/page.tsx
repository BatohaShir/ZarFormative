import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchRequestsPageData } from "@/lib/requests/list-query";
import { RequestsClient } from "./_components/requests-client";

// Per-user, can't be shared across users — revalidate disabled.
// Realtime subscription on the client keeps the grid fresh after
// the initial SSR payload.
export const revalidate = 0;

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required&redirect=/account/me/requests");
  }

  // One CTE round-trip for every request the user is party to + the
  // set of already-notified expired ids. Client uses both: the
  // request list seeds React Query, and the notified-ids set lets
  // the "create expired-notification" pass skip duplicates without
  // a separate findMany.
  const ssrData = await fetchRequestsPageData(user.id);

  // user.id is passed separately so the React Query seed below hashes
  // the hook's args on the very first render — without waiting for
  // the client-side Supabase auth singleton to resolve. Otherwise the
  // useState initializer runs while user?.id is still null, the seed
  // skips, and the findMany hook fires a cold REST call ~2s later.
  return <RequestsClient ssrData={ssrData} ssrUserId={user.id} />;
}
