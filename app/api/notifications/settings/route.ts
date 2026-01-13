import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const body = await request.json();
    const { userId, settings } = body;

    if (!userId || !settings) {
      return NextResponse.json(
        { error: "Missing userId or settings" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user.user || user.user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Upsert notification settings - no select to minimize response
    const { error } = await supabase
      .from("profiles_notification_settings")
      .upsert(
        {
          user_id: userId,
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
    console.error("Save settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
