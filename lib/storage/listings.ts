import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "listings";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Структура бакета listings:
 * listings/
 * └── {user_id}/
 *     └── {listing_id}/
 *         ├── {uuid}.jpg
 *         ├── {uuid}.png
 *         └── ...
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
 * Загрузить фото листинга
 */
export async function uploadListingImage(
  userId: string,
  listingId: string,
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
  const filePath = `${userId}/${listingId}/${uuid}.${fileExt}`;

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
 * Удалить фото листинга
 */
export async function deleteListingImage(url: string): Promise<{ error: string | null }> {
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

/**
 * Удалить все фото листинга
 */
export async function deleteAllListingImages(
  userId: string,
  listingId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${userId}/${listingId}`);

  if (listError) {
    return { error: listError.message };
  }

  if (!files || files.length === 0) {
    return { error: null };
  }

  const filePaths = files.map((file: { name: string }) => `${userId}/${listingId}/${file.name}`);

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Получить публичный URL фото листинга
 */
export function getListingImageUrl(
  userId: string,
  listingId: string,
  fileName: string
): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`${userId}/${listingId}/${fileName}`);
  return data.publicUrl;
}
