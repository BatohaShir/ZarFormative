import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, rateLimitResponse, addRateLimitHeaders } from "@/lib/rate-limit";

// UUID regex для валидации providerId и listingId
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * API для получения занятых временных слотов исполнителя на определенную дату
 *
 * GET /api/schedule?providerId=xxx&date=2024-01-20&listingId=xxx
 *
 * Возвращает массив занятых слотов с учетом длительности услуги
 */
export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute per IP (API config)
  const rateLimitResult = await withRateLimit(request, undefined, "API");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const dateStr = searchParams.get("date");
    const listingId = searchParams.get("listingId");

    if (!providerId || !dateStr) {
      return NextResponse.json(
        { error: "providerId and date are required" },
        { status: 400 }
      );
    }

    // Валидация providerId (должен быть UUID)
    if (!UUID_REGEX.test(providerId)) {
      return NextResponse.json(
        { error: "Invalid providerId format" },
        { status: 400 }
      );
    }

    // Валидация listingId если передан (должен быть UUID)
    if (listingId && !UUID_REGEX.test(listingId)) {
      return NextResponse.json(
        { error: "Invalid listingId format" },
        { status: 400 }
      );
    }

    // Парсим дату
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Не позволяем запросы на даты слишком далеко в прошлом (более 1 дня) или будущем (более 90 дней)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const maxFuture = new Date(now);
    maxFuture.setDate(maxFuture.getDate() + 90);

    if (date < yesterday || date > maxFuture) {
      return NextResponse.json(
        { error: "Date must be within valid range" },
        { status: 400 }
      );
    }

    // Устанавливаем начало и конец дня
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // ОПТИМИЗАЦИЯ: Один запрос вместо двух
    // Получаем все принятые заявки И данные листинга одним запросом
    const [bookedRequests, listingData] = await Promise.all([
      // Запрос 1: Получаем бронирования исполнителя
      prisma.listing_requests.findMany({
        where: {
          provider_id: providerId,
          preferred_date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            in: ["accepted", "in_progress"],
          },
          preferred_time: {
            not: null,
          },
        },
        select: {
          preferred_time: true,
          listing: {
            select: {
              duration_minutes: true,
            },
          },
        },
        orderBy: {
          preferred_time: "asc",
        },
      }),
      // Запрос 2: Получаем данные листинга (если передан listingId)
      listingId
        ? prisma.listings.findUnique({
            where: { id: listingId },
            select: {
              duration_minutes: true,
              work_hours_start: true,
              work_hours_end: true,
            },
          })
        : null,
    ]);

    // Устанавливаем дефолтные значения
    const currentListingDuration = listingData?.duration_minutes || 60;
    const workHoursStart = listingData?.work_hours_start || "09:00";
    const workHoursEnd = listingData?.work_hours_end || "18:00";

    // Формируем массив занятых слотов с учетом длительности
    // Не раскрываем информацию о чужих бронированиях (privacy)
    const busySlots: Array<{
      start: string;      // "HH:mm"
      end: string;        // "HH:mm"
    }> = [];

    for (const request of bookedRequests) {
      if (!request.preferred_time) continue;

      const [hours, minutes] = request.preferred_time.split(":").map(Number);
      const startMinutes = hours * 60 + minutes;

      // Длительность услуги из booking
      const duration = request.listing?.duration_minutes || 60;
      const endMinutes = startMinutes + duration;

      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;

      busySlots.push({
        start: request.preferred_time,
        end: `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`,
      });
    }

    // Парсим рабочие часы
    const [startH, startM] = workHoursStart.split(":").map(Number);
    const [endH, endM] = workHoursEnd.split(":").map(Number);
    const workStartMinutes = startH * 60 + startM;
    const workEndMinutes = endH * 60 + endM;

    // Генерируем все временные слоты в рамках рабочих часов (шаг 30 минут)
    const allSlots: string[] = [];
    for (let minutes = workStartMinutes; minutes < workEndMinutes; minutes += 30) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      allSlots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
    // Добавляем последний слот если нужно (конец рабочего дня)
    if (workEndMinutes % 30 === 0) {
      allSlots.push(workHoursEnd);
    }

    // Определяем какие слоты недоступны
    // Слот недоступен если:
    // 1. Он попадает в занятый период (start <= slot < end)
    // 2. Или если выбрав этот слот, услуга пересечется с занятым периодом
    const unavailableSlots: string[] = [];

    for (const slot of allSlots) {
      const [slotH, slotM] = slot.split(":").map(Number);
      const slotStart = slotH * 60 + slotM;
      const slotEnd = slotStart + currentListingDuration;

      // Проверяем пересечение с каждым занятым периодом
      for (const busy of busySlots) {
        const [busyStartH, busyStartM] = busy.start.split(":").map(Number);
        const [busyEndH, busyEndM] = busy.end.split(":").map(Number);
        const busyStart = busyStartH * 60 + busyStartM;
        const busyEnd = busyEndH * 60 + busyEndM;

        // Пересечение: если один период начинается до окончания другого
        // и заканчивается после начала другого
        if (slotStart < busyEnd && slotEnd > busyStart) {
          unavailableSlots.push(slot);
          break;
        }
      }
    }

    const response = NextResponse.json(
      {
        date: dateStr,
        providerId,
        busySlots,
        unavailableSlots,
        currentListingDuration,
        allSlots,
        workHoursStart,
        workHoursEnd,
      },
      {
        headers: {
          // Кэшируем на 1 минуту - расписание может меняться
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error("Schedule API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
