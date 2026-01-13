import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Только error логирование - экономит память
    log: ["error"],
    transactionOptions: {
      maxWait: 5000,
      timeout: 10000,
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
