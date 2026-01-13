import { enhance } from "@zenstackhq/runtime";
import { prisma } from "./index";
import { createClient } from "@/lib/supabase/server";

export async function getEnhancedPrisma() {
  const supabase = await createClient();
  let context = {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    context = {
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  return enhance(prisma, context);
}
