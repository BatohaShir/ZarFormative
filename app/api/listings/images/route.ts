import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

// Schema for batch image creation
const batchCreateSchema = z.object({
  listing_id: z.string().min(1),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    sort_order: z.number().int().min(0),
    is_cover: z.boolean(),
  })).min(1).max(10),
});

/**
 * POST /api/listings/images
 * Batch create listing images - reduces N queries to 1
 */
export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute
  const rateLimitResult = withRateLimit(request, undefined, { limit: 30, windowSeconds: 60 });
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = batchCreateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { listing_id, images } = parseResult.data;

    // Verify listing ownership
    const listing = await prisma.listings.findFirst({
      where: {
        id: listing_id,
        user_id: user.id,
      },
      select: { id: true },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found or access denied" },
        { status: 404 }
      );
    }

    // Batch create images in a single query
    const createdImages = await prisma.listings_images.createMany({
      data: images.map(img => ({
        listing_id,
        url: img.url,
        alt: img.alt || null,
        sort_order: img.sort_order,
        is_cover: img.is_cover,
      })),
    });

    return NextResponse.json({
      success: true,
      count: createdImages.count,
    });
  } catch (error) {
    console.error("Batch create images error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
