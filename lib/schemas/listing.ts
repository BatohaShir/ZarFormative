import { z } from "zod";

/**
 * Sanitize input: trim whitespace, normalize spaces, drop
 * characters that are either invisible (and used in homograph /
 * spoofing tricks) or have no legitimate place in a free-text
 * listing field.
 *
 * What we strip:
 *   - C0/C1 control bytes (0x00-0x1F, 0x7F-0x9F)
 *   - Zero-width chars (U+200B..U+200D, U+2060, U+FEFF) and the
 *     Mongolian vowel separator (U+180E) — invisible, bypass
 *     denylist regexes by being "no character" to the regex
 *     engine but still present in the rendered string
 *   - Bidi-override / format chars (U+202A..U+202E, U+2066..U+2069)
 *     — used for "rtl trick" attacks where the visible text
 *     differs from the underlying bytes
 *   - U+2028 / U+2029 (line/paragraph separators) — historic
 *     JSON / script-tag breaker
 *
 * Whitespace is normalised AFTER the strip so combining invisible
 * chars and tabs collapses to single spaces.
 */
const INVISIBLE_AND_BIDI =
  /[\u0000-\u001F\u007F-\u009F\u180E\u200B-\u200D\u2028-\u2029\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;

export const sanitizeText = (value: string) =>
  value
    .normalize("NFKC") // collapse fullwidth ＜＞ to <> so the denylist catches them
    .trim()
    .replace(INVISIBLE_AND_BIDI, "")
    .replace(/\s+/g, " ");

/**
 * Zod schema for listing form validation
 */
export const listingSchema = z
  .object({
    title: z
      .string()
      .min(1, "Гарчиг оруулна уу")
      .transform(sanitizeText)
      .pipe(
        z
          .string()
          .min(5, "Хамгийн багадаа 5 тэмдэгт")
          .max(200, "Хамгийн ихдээ 200 тэмдэгт")
          .regex(/^[^<>{}[\]`]*$/, "Тусгай тэмдэгт ашиглах боломжгүй")
      ),
    category_id: z.string().min(1, "Ангилал сонгоно уу").uuid("Ангилал ID буруу"),
    description: z
      .string()
      .min(1, "Тайлбар оруулна уу")
      .transform(sanitizeText)
      .pipe(
        z
          .string()
          .min(20, "Хамгийн багадаа 20 тэмдэгт")
          .max(5000, "Хамгийн ихдээ 5000 тэмдэгт")
          .regex(/^[^<>{}[\]`]*$/, "Тусгай тэмдэгт ашиглах боломжгүй")
      ),
    price: z
      .string()
      .transform((val) => val?.trim() || "")
      .refine(
        (val) =>
          !val || (/^\d+(\.\d{1,2})?$/.test(val) && Number(val) > 0 && Number(val) <= 999999999),
        "Үнэ 1-999,999,999 хооронд байх ёстой"
      ),
    is_negotiable: z.boolean(),
    duration_minutes: z
      .string()
      .transform((val) => val?.trim() || "")
      .refine(
        (val) => !val || (/^\d+$/.test(val) && Number(val) >= 15 && Number(val) <= 1440),
        "Хугацаа 15-1440 минутын хооронд байх ёстой"
      ),
    service_type: z.enum(["on_site", "remote"]),
    phone: z
      .string()
      .transform((val) => val?.replace(/\D/g, "") || "")
      .refine((val) => !val || val.length === 8, "Утасны дугаар 8 оронтой байх ёстой"),
    address_detail: z.string().transform((val) => val?.trim() || ""),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    work_hours_start: z
      .string()
      .transform((val) => val || "09:00")
      .pipe(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Формат: HH:mm")),
    work_hours_end: z
      .string()
      .transform((val) => val || "18:00")
      .pipe(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Формат: HH:mm")),
  })
  .refine(
    (data) => {
      const [startH, startM] = data.work_hours_start.split(":").map(Number);
      const [endH, endM] = data.work_hours_end.split(":").map(Number);
      return startH * 60 + startM < endH * 60 + endM;
    },
    { message: "Дуусах цаг эхлэх цагаас хойш байх ёстой", path: ["work_hours_end"] }
  )
  .refine((data) => data.is_negotiable || (data.price && data.price.length > 0), {
    message: "Үнэ оруулна уу эсвэл 'Тохиролцоно' сонгоно уу",
    path: ["price"],
  });

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
  phone: "",
  address_detail: "",
  latitude: null,
  longitude: null,
  work_hours_start: "09:00",
  work_hours_end: "18:00",
};
