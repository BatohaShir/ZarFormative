import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateServiceSchema } from "@/lib/validations/service";
import {
  formatError,
  logError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/lib/error-handler";

// GET /api/services/[id] - Get single service
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            createdAt: true,
          },
        },
        category: true,
        features: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundError("Үйлчилгээ олдсонгүй");
    }

    return NextResponse.json({
      success: true,
      data: service,
    });
  } catch (error) {
    logError(error, { route: "/api/services/[id]" });
    const formattedError = formatError(error);

    return NextResponse.json(
      { success: false, error: formattedError.message },
      { status: formattedError.statusCode }
    );
  }
}

// PATCH /api/services/[id] - Update service
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const { id } = await params;
    const body = await req.json();

    // Check if service exists and user owns it
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      throw new NotFoundError("Үйлчилгээ олдсонгүй");
    }

    if (existingService.userId !== session.user.id) {
      throw new AuthorizationError("Та энэ үйлчилгээг засах эрхгүй байна");
    }

    // Validate input
    const validationResult = updateServiceSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.issues[0].message);
    }

    const { features, ...serviceData } = validationResult.data;

    // Update service
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        ...serviceData,
        ...(features && {
          features: {
            deleteMany: {},
            create: features.map((text) => ({ text })),
          },
        }),
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

    return NextResponse.json({
      success: true,
      message: "Үйлчилгээ амжилттай шинэчлэгдлээ",
      data: updatedService,
    });
  } catch (error) {
    logError(error, { route: "/api/services/[id] PATCH" });
    const formattedError = formatError(error);

    return NextResponse.json(
      { success: false, error: formattedError.message },
      { status: formattedError.statusCode }
    );
  }
}

// DELETE /api/services/[id] - Delete service
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const { id } = await params;

    // Check if service exists and user owns it
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      throw new NotFoundError("Үйлчилгээ олдсонгүй");
    }

    if (existingService.userId !== session.user.id) {
      throw new AuthorizationError("Та энэ үйлчилгээг устгах эрхгүй байна");
    }

    // Delete service
    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Үйлчилгээ амжилттай устгагдлаа",
    });
  } catch (error) {
    logError(error, { route: "/api/services/[id] DELETE" });
    const formattedError = formatError(error);

    return NextResponse.json(
      { success: false, error: formattedError.message },
      { status: formattedError.statusCode }
    );
  }
}
