import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "requests";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Структура бакета requests:
 * requests/
 * └── {user_id}/
 *     └── {uuid}.jpg
 */

export interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Проверка валидности файла
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Недопустимый тип файла. Разрешены: ${ALLOWED_TYPES.join(", ")}`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `Размер файла превышает ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  return null;
}

/**
 * Загрузить фото заявки
 */
export async function uploadRequestImage(
  userId: string,
  file: File,
  uuid: string
): Promise<UploadResult> {
  const supabase = createClient();

  // Валидация
  const validationError = validateImageFile(file);
  if (validationError) {
    return { url: null, error: validationError };
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${userId}/${uuid}.${fileExt}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return { url: data.publicUrl, error: null };
}

/**
 * Удалить фото заявки
 */
export async function deleteRequestImage(url: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Извлекаем путь из URL
  const urlParts = url.split(`${BUCKET_NAME}/`);
  if (urlParts.length < 2) {
    return { error: "Неверный формат URL" };
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
