import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";

const prisma = new PrismaClient();

// Период уникальности просмотра (24 часа)
const VIEW_UNIQUENESS_PERIOD_HOURS = 24;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slug } = await params;

    // Получаем IP адрес
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    // Получаем текущего пользователя (если авторизован)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const viewerId = user?.id || null;

    // Находим объявление по slug
    const listing = await prisma.listings.findFirst({
      where: {
        slug: slug,
        status: "active",
        is_active: true,
      },
      select: { id: true, user_id: true, views_count: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Не считаем просмотры владельца объявления
    if (viewerId && viewerId === listing.user_id) {
      return NextResponse.json({
        success: true,
        views_count: listing.views_count,
        skipped: true,
        reason: "owner",
      });
    }

    // Проверяем, был ли уже просмотр за последние 24 часа
    const viewCutoff = new Date();
    viewCutoff.setHours(viewCutoff.getHours() - VIEW_UNIQUENESS_PERIOD_HOURS);

    const existingView = await prisma.listings_views.findFirst({
      where: {
        listing_id: listing.id,
        viewed_at: { gte: viewCutoff },
        OR: [
          // Если авторизован - проверяем по user_id
          ...(viewerId ? [{ viewer_id: viewerId }] : []),
          // Если гость - проверяем по IP
          ...(!viewerId ? [{ ip_address: ip, viewer_id: null }] : []),
        ],
      },
    });

    if (existingView) {
      // Уже просмотрено за последние 24 часа
      return NextResponse.json({
        success: true,
        views_count: listing.views_count,
        skipped: true,
        reason: "already_viewed",
      });
    }

    // Создаём запись о просмотре и увеличиваем счётчик в транзакции
    const [, updated] = await prisma.$transaction([
      prisma.listings_views.create({
        data: {
          listing_id: listing.id,
          viewer_id: viewerId,
          ip_address: viewerId ? null : ip, // IP только для гостей
        },
      }),
      prisma.listings.update({
        where: { id: listing.id },
        data: { views_count: { increment: 1 } },
        select: { views_count: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      views_count: updated.views_count,
    });
  } catch (error) {
    console.error("Error tracking view:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
