import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { formatError, logError, ValidationError } from "@/lib/error-handler";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.issues[0].message);
    }

    const { name, email, phone, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ValidationError("Энэ имэйл хаягаар бүртгүүлсэн байна");
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Амжилттай бүртгэгдлээ",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    logError(error, { route: "/api/auth/register" });
    const formattedError = formatError(error);

    return NextResponse.json(
      {
        success: false,
        error: formattedError.message,
      },
      { status: formattedError.statusCode }
    );
  }
}
