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

  return <RequestsClient ssrData={ssrData} />;
}
