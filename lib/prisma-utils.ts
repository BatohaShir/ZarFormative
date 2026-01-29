/**
 * Prisma Type Utilities
 *
 * Helper functions for handling Prisma-specific types safely.
 * Addresses common issues like BigInt serialization and type guards.
 */

/**
 * Safely converts a BigInt or number to a JavaScript number.
 * PostgreSQL COUNT/SUM operations return bigint, which can't be serialized to JSON.
 *
 * @example
 * const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
 * const count = toNumber(result[0].count); // Always a number
 */
export function toNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "bigint") return Number(value);
  return value;
}

/**
 * Safely converts a value that might be a BigInt to a string.
 *
 * @example
 * const id = toBigIntString(record.id); // "123456789012345678"
 */
export function toBigIntString(value: bigint | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

/**
 * Type guard for checking if a value is a BigInt
 */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === "bigint";
}

/**
 * Converts raw query result fields from BigInt to Number.
 * Useful when you need to serialize query results to JSON.
 *
 * @example
 * const results = await prisma.$queryRaw`SELECT id, views_count FROM listings`;
 * return normalizeQueryResult(results, ["views_count"]); // views_count is now number
 */
export function normalizeQueryResult<T extends Record<string, unknown>>(
  result: T[],
  bigIntFields: (keyof T)[]
): T[] {
  return result.map((row) => {
    const normalized = { ...row };
    for (const field of bigIntFields) {
      const value = normalized[field];
      if (typeof value === "bigint") {
        (normalized[field] as unknown) = Number(value);
      }
    }
    return normalized;
  });
}

/**
 * Converts a single raw query result row, handling BigInt fields.
 *
 * @example
 * const [result] = await prisma.$queryRaw`SELECT views_count, inserted FROM ...`;
 * const normalized = normalizeSingleResult(result, ["views_count"]);
 */
export function normalizeSingleResult<T extends Record<string, unknown>>(
  row: T,
  bigIntFields: (keyof T)[]
): T {
  const normalized = { ...row };
  for (const field of bigIntFields) {
    const value = normalized[field];
    if (typeof value === "bigint") {
      (normalized[field] as unknown) = Number(value);
    }
  }
  return normalized;
}

/**
 * Prisma Decimal handling - converts Prisma Decimal to number.
 * Prisma's Decimal type is not a native JS type.
 */
export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  // Prisma Decimal has a toNumber() method
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return 0;
}

/**
 * Type guard for Prisma's nullable fields.
 * Helps with strict null checking.
 *
 * @example
 * const user = await prisma.user.findUnique({ ... });
 * if (isNotNull(user)) {
 *   // user is guaranteed to be non-null here
 * }
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for Prisma's optional relation fields.
 * Useful when includes might be undefined.
 *
 * @example
 * const listing = await prisma.listings.findUnique({
 *   include: { user: true }
 * });
 * if (hasRelation(listing, 'user')) {
 *   // listing.user is guaranteed to be defined
 * }
 */
export function hasRelation<T extends Record<string, unknown>, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): obj is T & { [P in K]-?: NonNullable<T[P]> } {
  return obj !== null && obj !== undefined && obj[key] !== null && obj[key] !== undefined;
}

/**
 * Safe JSON serialization that handles BigInt.
 * Use this when you need to serialize Prisma query results.
 *
 * @example
 * const data = await prisma.$queryRaw`...`;
 * return new Response(safeJsonStringify(data));
 */
export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) => (typeof v === "bigint" ? Number(v) : v));
}
