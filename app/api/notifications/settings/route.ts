import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Zod schema for notification settings validation
const notificationSettingsSchema = z.object({
  settings: z.object({
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    pushNewRequests: z.boolean().optional(),
    pushNewMessages: z.boolean().optional(),
    pushStatusChanges: z.boolean().optional(),
    emailNewRequests: z.boolean().optional(),
    emailNewMessages: z.boolean().optional(),
    emailDigest: z.boolean().optional(),
    emailDigestFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
  }),
});

// GET /api/notifications/settings - Get notification settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting: 30 requests per minute per user
    const rateLimit = withRateLimit(request, user.user.id, { limit: 30, windowSeconds: 60 });
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    // Get notification settings - select only needed fields
    const { data, error } = await supabase
      .from("profiles_notification_settings")
      .select(`
        id,
        push_enabled,
        push_new_requests,
        push_new_messages,
        push_status_changes,
        email_enabled,
        email_new_requests,
        email_new_messages,
        email_digest,
        email_digest_frequency,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end
      `)
      .eq("user_id", user.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = row not found, which is ok
      console.error("Error getting settings:", error);
      return NextResponse.json(
        { error: "Failed to get settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data || null });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/notifications/settings - Save notification settings
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
    const validation = notificationSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid settings data", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { settings } = validation.data;

    // Upsert notification settings - no select to minimize response
    const { error } = await supabase
      .from("profiles_notification_settings")
      .upsert(
        {
          user_id: user.id,
          push_enabled: settings.pushEnabled,
          email_enabled: settings.emailEnabled,
          push_new_requests: settings.pushNewRequests,
          push_new_messages: settings.pushNewMessages,
          push_status_changes: settings.pushStatusChanges,
          email_new_requests: settings.emailNewRequests,
          email_new_messages: settings.emailNewMessages,
          email_digest: settings.emailDigest,
          email_digest_frequency: settings.emailDigestFrequency,
          quiet_hours_enabled: settings.quietHoursEnabled,
          quiet_hours_start: settings.quietHoursStart,
          quiet_hours_end: settings.quietHoursEnd,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select("id")
      .single();

    if (error) {
      console.error("Error saving settings:", error);
      return NextResponse.json(
        { error: "Failed to save settings" },
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
    console.error("Save settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
