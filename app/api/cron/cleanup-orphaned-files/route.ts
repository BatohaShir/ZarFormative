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

    // OPTIMIZATION: Use raw SQL with DISTINCT to avoid loading all rows into memory
    const usedAttachments = await prisma.$queryRaw<{ attachment_url: string }[]>`
      SELECT DISTINCT attachment_url FROM chat_messages WHERE attachment_url IS NOT NULL
    `;

    const usedUrls = new Set(usedAttachments.map((m) => m.attachment_url));

    // List files in the bucket (top-level folders = request IDs)
    const { data: folders, error: listError } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000 });

    if (listError) {
      results.errors.push(`Failed to list bucket: ${listError.message}`);
      return NextResponse.json({ success: false, results }, { status: 500 });
    }

    results.checkedBuckets.push(BUCKET);

    // OPTIMIZATION: Parallelize subfolder listing instead of sequential loops
    const validFolders = (folders || []).filter((f) => f.name);

    // Fetch all subfolders in parallel (graceful: partial failures don't block)
    const subfolderSettled = await Promise.allSettled(
      validFolders.map((folder) =>
        supabase.storage
          .from(BUCKET)
          .list(folder.name, { limit: 1000 })
          .then((res) => ({
            folder: folder.name,
            subfolders: res.data || [],
          }))
      )
    );

    const subfolderResults = subfolderSettled
      .filter(
        (r): r is PromiseFulfilledResult<{ folder: string; subfolders: typeof folders }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    // Log failures
    subfolderSettled
      .filter((r) => r.status === "rejected")
      .forEach((r) => {
        results.errors.push(`Subfolder listing failed: ${(r as PromiseRejectedResult).reason}`);
      });

    // Build list of all folder paths, then fetch files in parallel
    const allFolderPaths = subfolderResults.flatMap(({ folder, subfolders }) =>
      (subfolders || []).map((sf) => `${folder}/${sf.name}`)
    );

    const fileSettled = await Promise.allSettled(
      allFolderPaths.map((folderPath) =>
        supabase.storage
          .from(BUCKET)
          .list(folderPath, { limit: 1000 })
          .then((res) => ({
            folderPath,
            files: res.data || [],
          }))
      )
    );

    const fileResults = fileSettled
      .filter(
        (
          r
        ): r is PromiseFulfilledResult<{
          folderPath: string;
          files: NonNullable<typeof folders>;
        }> => r.status === "fulfilled"
      )
      .map((r) => r.value);

    fileSettled
      .filter((r) => r.status === "rejected")
      .forEach((r) => {
        results.errors.push(`File listing failed: ${(r as PromiseRejectedResult).reason}`);
      });

    // Find orphaned files across all folders
    const allOrphanedPaths: string[] = [];

    for (const { folderPath, files } of fileResults) {
      for (const file of files) {
        const fileDate = new Date(file.created_at ?? Date.now());
        if (fileDate > ONE_DAY_AGO) continue;

        const { data: publicUrlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${folderPath}/${file.name}`);

        if (!usedUrls.has(publicUrlData.publicUrl)) {
          allOrphanedPaths.push(`${folderPath}/${file.name}`);
        }
      }
    }

    // Delete all orphaned files in a single batch
    if (allOrphanedPaths.length > 0) {
      const { error: deleteError } = await supabase.storage.from(BUCKET).remove(allOrphanedPaths);

      if (deleteError) {
        results.errors.push(`Failed to delete orphaned files: ${deleteError.message}`);
      } else {
        results.deletedFiles += allOrphanedPaths.length;
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
