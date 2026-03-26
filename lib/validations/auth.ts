import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Зөв имэйл хаяг оруулна уу"),
  password: z.string().min(6, "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Нэр хамгийн багадаа 2 тэмдэгт байх ёстой"),
    email: z.string().email("Зөв имэйл хаяг оруулна уу"),
    phone: z.string().min(8, "Утасны дугаар зөв оруулна уу").optional(),
    password: z
      .string()
      .min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой")
      .regex(/[A-Z]/, "Нууц үг том үсэг агуулсан байх ёстой")
      .regex(/[a-z]/, "Нууц үг жижиг үсэг агуулсан байх ёстой")
      .regex(/[0-9]/, "Нууц үг тоо агуулсан байх ёстой"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Нууц үг таарахгүй байна",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Нэр хамгийн багадаа 2 тэмдэгт байх ёстой").optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  image: z.string().url().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
