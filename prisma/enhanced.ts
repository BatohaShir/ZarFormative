import { enhance } from "@zenstackhq/runtime";
import { prisma } from "./index";
import { createClient } from "@/lib/supabase/server";

export async function getEnhancedPrisma() {
  const supabase = await createClient();
  let context = {};

  // Используем getUser() - middleware уже обновила сессию,
  // поэтому getUser() безопасен и проверяет аутентичность токена
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Получаем профиль с ролью из базы данных
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    context = {
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || "user",
      },
    };
  }

  return enhance(prisma, context);
}
