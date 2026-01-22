import { z } from "zod";

export const createServiceSchema = z.object({
  title: z.string().min(5, "Гарчиг хамгийн багадаа 5 тэмдэгт байх ёстой"),
  description: z.string().min(10, "Тайлбар хамгийн багадаа 10 тэмдэгт байх ёстой"),
  fullDescription: z.string().min(50, "Дэлгэрэнгүй тайлбар хамгийн багадаа 50 тэмдэгт байх ёстой"),
  price: z.string().min(1, "Үнэ оруулна уу"),
  categoryId: z.string().uuid("Ангилал сонгоно уу"),
  city: z.string().min(2, "Хот сонгоно уу"),
  image: z.string().url("Зураг оруулна уу"),
  features: z.array(z.string()).min(1, "Хамгийн багадаа 1 онцлог нэмнэ үү"),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createReviewSchema = z.object({
  rating: z.number().min(1).max(5, "Үнэлгээ 1-5 хооронд байх ёстой"),
  comment: z.string().min(10, "Сэтгэгдэл хамгийн багадаа 10 тэмдэгт байх ёстой"),
  serviceId: z.string().uuid(),
});

export const serviceRequestSchema = z.object({
  serviceId: z.string().uuid(),
  message: z.string().min(10, "Мессеж хамгийн багадаа 10 тэмдэгт байх ёстой"),
  contactInfo: z.object({
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email().optional(),
  }),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
