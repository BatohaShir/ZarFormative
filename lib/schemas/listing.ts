import { z } from "zod";

/**
 * Sanitize input: trim whitespace, normalize spaces, remove control characters
 */
export const sanitizeText = (value: string) =>
  value
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " "); // Normalize whitespace

/**
 * Zod schema for listing form validation
 */
export const listingSchema = z.object({
  title: z
    .string()
    .min(1, "Гарчиг оруулна уу")
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(5, "Хамгийн багадаа 5 тэмдэгт")
        .max(200, "Хамгийн ихдээ 200 тэмдэгт")
        .regex(/^[^<>{}[\]]*$/, "Тусгай тэмдэгт ашиглах боломжгүй")
    ),
  category_id: z
    .string()
    .min(1, "Ангилал сонгоно уу")
    .or(z.literal(""))
    .refine(val => val !== "", "Ангилал сонгоно уу")
    .refine(val => !val || /^[a-zA-Z0-9-_]+$/.test(val), "Ангилал ID буруу"),
  description: z
    .string()
    .min(1, "Тайлбар оруулна уу")
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(20, "Хамгийн багадаа 20 тэмдэгт")
        .max(5000, "Хамгийн ихдээ 5000 тэмдэгт")
        .regex(/^[^<>{}[\]]*$/, "Тусгай тэмдэгт ашиглах боломжгүй")
    ),
  price: z
    .string()
    .transform(val => val?.trim() || "")
    .refine(
      val => !val || (/^\d+(\.\d{1,2})?$/.test(val) && Number(val) >= 0 && Number(val) <= 999999999),
      "Үнэ буруу форматтай (0-999,999,999)"
    ),
  is_negotiable: z.boolean(),
  duration_minutes: z
    .string()
    .transform(val => val?.trim() || "")
    .refine(
      val => !val || (/^\d+$/.test(val) && Number(val) >= 15 && Number(val) <= 1440),
      "Хугацаа 15-1440 минутын хооронд байх ёстой"
    ),
  service_type: z.enum(["on_site", "remote"]),
  work_hours_start: z
    .string()
    .transform(val => val || "09:00")
    .pipe(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Формат: HH:mm")),
  work_hours_end: z
    .string()
    .transform(val => val || "18:00")
    .pipe(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Формат: HH:mm")),
}).refine(
  data => {
    const [startH, startM] = data.work_hours_start.split(":").map(Number);
    const [endH, endM] = data.work_hours_end.split(":").map(Number);
    return (startH * 60 + startM) < (endH * 60 + endM);
  },
  { message: "Дуусах цаг эхлэх цагаас хойш байх ёстой", path: ["work_hours_end"] }
);

export type ListingFormData = z.infer<typeof listingSchema>;

/**
 * Default values for the listing form
 */
export const listingFormDefaults: ListingFormData = {
  title: "",
  category_id: "",
  description: "",
  price: "",
  is_negotiable: false,
  duration_minutes: "",
  service_type: "on_site",
  work_hours_start: "09:00",
  work_hours_end: "18:00",
};
