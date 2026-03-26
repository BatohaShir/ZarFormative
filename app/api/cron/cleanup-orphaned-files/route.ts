import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Cron job to cleanup orphaned files in chat-attachments bucket.
 *
 * An orphaned file is one that exists in storage but has no corresponding
 * chat_messages row referencing it. This happens when:
 * 1. File upload succeeds but message creation fails
 * 2. Message is deleted but file remains
 *
 * Runs daily. Only deletes files older than 24 hours to avoid
 * deleting files that are still being processed.
 *
 * GET /api/cron/cleanup-orphaned-files
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = await withRateLimit(request, undefined, "CRON");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    checkedBuckets: [] as string[],
    deletedFiles: 0,
    errors: [] as string[],
  };

  try {
    const supabase = await createClient();
    const BUCKET = "chat-attachments";
    const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get all attachment URLs referenced in chat_messages
    const usedAttachments = await prisma.chat_messages.findMany({
      where: {
        attachment_url: { not: null },
      },
      select: { attachment_url: true },
    });

    const usedUrls = new Set(
      usedAttachments.map((m) => m.attachment_url).filter(Boolean) as string[]
    );

    // List files in the bucket (top-level folders = request IDs)
    const { data: folders, error: listError } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 100 });

    if (listError) {
      results.errors.push(`Failed to list bucket: ${listError.message}`);
      return NextResponse.json({ success: false, results }, { status: 500 });
    }

    results.checkedBuckets.push(BUCKET);

    // Check each folder for orphaned files
    for (const folder of folders || []) {
      if (!folder.name) continue;

      const { data: subfolders } = await supabase.storage
        .from(BUCKET)
        .list(folder.name, { limit: 100 });

      for (const subfolder of subfolders || []) {
        const folderPath = `${folder.name}/${subfolder.name}`;
        const { data: files } = await supabase.storage
          .from(BUCKET)
          .list(folderPath, { limit: 100 });

        const orphanedPaths: string[] = [];

        for (const file of files || []) {
          // Skip files newer than 24 hours (might still be processing)
          const fileDate = new Date(file.created_at);
          if (fileDate > ONE_DAY_AGO) continue;

          // Check if this file is referenced by any message
          const { data: publicUrlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(`${folderPath}/${file.name}`);

          if (!usedUrls.has(publicUrlData.publicUrl)) {
            orphanedPaths.push(`${folderPath}/${file.name}`);
          }
        }

        // Delete orphaned files in batch
        if (orphanedPaths.length > 0) {
          const { error: deleteError } = await supabase.storage.from(BUCKET).remove(orphanedPaths);

          if (deleteError) {
            results.errors.push(`Failed to delete in ${folderPath}: ${deleteError.message}`);
          } else {
            results.deletedFiles += orphanedPaths.length;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("Cron cleanup-orphaned-files error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
      },
      { status: 500 }
    );
  }
}
