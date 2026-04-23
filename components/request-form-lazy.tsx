"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

/**
 * Deferred loader for the ~1200-line RequestForm.
 *
 * The full form pulls in the ZenStack mutations, image compression,
 * a month-long calendar, time picker, map picker, phone validation,
 * and the rest of the kitchen sink — none of which the visitor needs
 * until they actually decide to book. Shipping that in the initial
 * bundle turned every service-detail page view into a 30–50 KB
 * client payload the user usually never runs.
 *
 * This wrapper renders only a button. On first click, it lazy-loads
 * the real form chunk and mounts it with `defaultOpen` so the dialog
 * is visible without a second click. Subsequent opens are instant —
 * the chunk is cached in memory.
 *
 * `onClose` from RequestForm flips our mounted flag back to false,
 * letting the dialog's close animation play and freeing the state.
 */

// dynamic() with ssr:false — the form is interactive only, there's
// nothing useful to render on the server before the user clicks.
const RequestFormImpl = dynamic(
  () => import("@/components/request-form").then((m) => ({ default: m.RequestForm })),
  { ssr: false }
);

interface RequestFormLazyProps {
  listingId: string;
  listingTitle: string;
  providerId: string;
  providerName: string;
  serviceType?: "on_site" | "remote";
  /** Optional override for the trigger label. */
  triggerLabel?: string;
}

export function RequestFormLazy({
  listingId,
  listingTitle,
  providerId,
  providerName,
  serviceType,
  triggerLabel = "Хүсэлт илгээх",
}: RequestFormLazyProps) {
  const [mounted, setMounted] = React.useState(false);

  const handleClick = React.useCallback(() => {
    setMounted(true);
  }, []);

  const handleClose = React.useCallback(() => {
    // Let the dialog finish animating out before unmounting. 200ms
    // matches the default Radix Dialog exit transition. Without the
    // delay the overlay vanishes instantly when the user clicks away
    // — visually abrupt even though functionally correct.
    const id = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      {!mounted && (
        <Button className="w-full" size="lg" onClick={handleClick}>
          <MessageSquare className="h-5 w-5 mr-2" />
          {triggerLabel}
        </Button>
      )}
      {mounted && (
        <RequestFormImpl
          listingId={listingId}
          listingTitle={listingTitle}
          providerId={providerId}
          providerName={providerName}
          serviceType={serviceType}
          defaultOpen
          onClose={handleClose}
        />
      )}
    </>
  );
}
