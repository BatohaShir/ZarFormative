import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  /** Whether to render the badge at all — callers pass profile.is_verified directly. */
  verified: boolean | null | undefined;
  /** Visual size. `sm` pairs with body text, `md` with card titles, `lg` with the profile hero. */
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Tooltip / screen-reader label. Defaults to Mongolian "Verified". */
  title?: string;
}

const SIZE_MAP = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
} as const;

/**
 * Blue checkmark shown next to a provider's name when their profile
 * has completed enough jobs to earn verification. Reads a boolean the
 * server already computed (profiles.is_verified, maintained by a DB
 * trigger) — callers never recompute the threshold client-side.
 *
 * Returns null when `verified` is falsy so callers can unconditionally
 * drop <VerifiedBadge verified={...} /> into JSX without wrapping it.
 */
export function VerifiedBadge({
  verified,
  size = "sm",
  className,
  title = "Баталгаажсан",
}: VerifiedBadgeProps) {
  if (!verified) return null;
  return (
    <BadgeCheck
      className={cn("inline-block shrink-0 text-brand fill-brand/10", SIZE_MAP[size], className)}
      aria-label={title}
      role="img"
    />
  );
}
