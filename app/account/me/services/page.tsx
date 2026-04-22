import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchMyServicesData } from "@/lib/profile/my-services-query";
import { ServicesClient } from "./_components/services-client";

// Dynamic: depends on the signed-in user, can't be shared across users.
export const revalidate = 0;

export default async function MyServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required&redirect=/account/me/services");
  }

  // Single CTE round-trip for listings + active boosts. Client seeds
  // React Query on mount so the ZenStack hooks skip their fetch.
  const ssrData = await fetchMyServicesData(user.id);

  return <ServicesClient ssrData={ssrData} />;
}
