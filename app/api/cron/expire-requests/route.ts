import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * API для ручного запуска отмены просроченных заявок
 *
 * Правила:
 * 1. pending → если прошло 24 часа с момента создания → cancelled
 * 2. accepted → если прошло 2 часа после назначенного времени → cancelled
 *
 * Основной cron запускается через Supabase pg_cron каждые 15 минут.
 * Этот endpoint - для ручного тестирования и мониторинга.
 *
 * GET /api/cron/expire-requests
 */
export async function GET(request: NextRequest) {
  // Rate limit: 5 requests per minute (CRON config)
  const rateLimitResult = await withRateLimit(request, undefined, "CRON");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // ВАЖНО: В production режиме ВСЕГДА требуем секрет
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // В development если секрет задан, проверяем его
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    expiredPending: 0,
    expiredAccepted: 0,
    notificationsCreated: 0,
    errors: [] as string[],
  };

  try {
    // ========================================
    // 1. Отмена PENDING заявок старше 24 часов
    // ========================================
    const pendingDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const expiredPendingRequests = await prisma.listing_requests.findMany({
      where: {
        status: "pending",
        created_at: {
          lt: pendingDeadline,
        },
      },
      select: {
        id: true,
        client_id: true,
        provider_id: true,
        listing: {
          select: {
            title: true,
          },
        },
      },
    });

    if (expiredPendingRequests.length > 0) {
      // Update all expired pending requests
      await prisma.listing_requests.updateMany({
        where: {
          id: {
            in: expiredPendingRequests.map((r) => r.id),
          },
        },
        data: {
          status: "cancelled_by_provider", // Using existing status, можно добавить auto_expired
          provider_response: "Хүсэлт 24 цагийн дотор хариулагдаагүй тул автоматаар цуцлагдлаа",
        },
      });

      results.expiredPending = expiredPendingRequests.length;

      // Create notifications for clients
      const clientNotifications = expiredPendingRequests.map((r) => ({
        user_id: r.client_id,
        type: "request_rejected" as const,
        title: "Хүсэлт хугацаа дууссан",
        message: `"${r.listing.title}" хүсэлт 24 цагийн дотор хариулагдаагүй тул цуцлагдлаа`,
        request_id: r.id,
        actor_id: null,
      }));

      await prisma.notifications.createMany({
        data: clientNotifications,
      });

      results.notificationsCreated += clientNotifications.length;
    }

    // ========================================
    // 2. Отмена ACCEPTED заявок с просроченным временем
    // ========================================
    // Находим accepted заявки где preferred_date + preferred_time уже прошло + 2 часа
    const acceptedRequests = await prisma.listing_requests.findMany({
      where: {
        status: "accepted",
        preferred_date: {
          not: null,
        },
      },
      select: {
        id: true,
        client_id: true,
        provider_id: true,
        preferred_date: true,
        preferred_time: true,
        listing: {
          select: {
            title: true,
          },
        },
      },
    });

    const expiredAcceptedIds: string[] = [];
    const acceptedNotifications: Array<{
      user_id: string;
      type: "cancelled_by_provider";
      title: string;
      message: string;
      request_id: string;
      actor_id: string | null;
    }> = [];

    for (const request of acceptedRequests) {
      if (!request.preferred_date) continue;

      // Combine date and time
      const preferredDateTime = new Date(request.preferred_date);
      if (request.preferred_time) {
        const [hours, minutes] = request.preferred_time.split(":").map(Number);
        preferredDateTime.setHours(hours, minutes, 0, 0);
      } else {
        // If no time specified, use start of day
        preferredDateTime.setHours(9, 0, 0, 0);
      }

      // Add 2 hours grace period
      const deadline = new Date(preferredDateTime.getTime() + 2 * 60 * 60 * 1000);

      if (now > deadline) {
        expiredAcceptedIds.push(request.id);

        // Notification for client
        acceptedNotifications.push({
          user_id: request.client_id,
          type: "cancelled_by_provider",
          title: "Захиалга цуцлагдлаа",
          message: `"${request.listing.title}" захиалга хугацаандаа эхлээгүй тул автоматаар цуцлагдлаа`,
          request_id: request.id,
          actor_id: null,
        });

        // Notification for provider
        acceptedNotifications.push({
          user_id: request.provider_id,
          type: "cancelled_by_provider",
          title: "Захиалга цуцлагдлаа",
          message: `"${request.listing.title}" захиалга хугацаандаа эхлээгүй тул автоматаар цуцлагдлаа`,
          request_id: request.id,
          actor_id: null,
        });
      }
    }

    if (expiredAcceptedIds.length > 0) {
      await prisma.listing_requests.updateMany({
        where: {
          id: {
            in: expiredAcceptedIds,
          },
        },
        data: {
          status: "cancelled_by_provider",
          provider_response: "Ажил хугацаандаа эхлээгүй тул автоматаар цуцлагдлаа",
        },
      });

      results.expiredAccepted = expiredAcceptedIds.length;

      await prisma.notifications.createMany({
        data: acceptedNotifications,
      });

      results.notificationsCreated += acceptedNotifications.length;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("Cron expire-requests error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
