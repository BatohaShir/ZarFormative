import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServiceSchema } from "@/lib/validations/service";
import {
  formatError,
  logError,
  AuthenticationError,
  ValidationError,
} from "@/lib/error-handler";

// GET /api/services - Get all services with filters
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const minRating = searchParams.get("minRating");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    const where: any = {};

    if (categoryId) where.categoryId = categoryId;
    if (city) where.city = city;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (minRating) where.rating = { gte: parseFloat(minRating) };

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          category: true,
          features: true,
          _count: {
            select: {
              reviews: true,
              favorites: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.service.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError(error, { route: "/api/services" });
    const formattedError = formatError(error);

    return NextResponse.json(
      { success: false, error: formattedError.message },
      { status: formattedError.statusCode }
    );
  }
}

// POST /api/services - Create a new service
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const body = await req.json();

    // Validate input
    const validationResult = createServiceSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.issues[0].message);
    }

    const { features, ...serviceData } = validationResult.data;

    // Create service with features
    const service = await prisma.service.create({
      data: {
        ...serviceData,
        userId: session.user.id,
        features: {
          create: features.map((text) => ({ text })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        category: true,
        features: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Үйлчилгээ амжилттай үүсгэлээ",
        data: service,
      },
      { status: 201 }
    );
  } catch (error) {
    logError(error, { route: "/api/services POST" });
    const formattedError = formatError(error);

    return NextResponse.json(
      { success: false, error: formattedError.message },
      { status: formattedError.statusCode }
    );
  }
}
