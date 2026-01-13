import { NextRequestHandler } from "@zenstackhq/server/next";
import { getEnhancedPrisma } from "@/prisma/enhanced";

const handler = NextRequestHandler({
  getPrisma: async () => await getEnhancedPrisma(),
  useAppDir: true,
});

export {
  handler as DELETE,
  handler as GET,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
