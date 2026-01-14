import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Zod schema for push subscription validation
const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }).optional(),
    expirationTime: z.number().nullable().optional(),
  }),
});

// POST /api/notifications/subscribe - Save push subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user from session (not from request body!)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting: 10 requests per minute per user
    const rateLimit = withRateLimit(request, user.id, { limit: 10, windowSeconds: 60 });
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    // Validate request body with Zod
    const body = await request.json();
    const validation = pushSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid subscription data", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { subscription } = validation.data;

    // Upsert push subscription - select only id to minimize response
    const { error } = await supabase
      .from("profiles_push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          expires_at: subscription.expirationTime
            ? new Date(subscription.expirationTime).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,endpoint",
        }
      )
      .select("id")
      .single();

    if (error) {
      console.error("Error saving subscription:", error);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
