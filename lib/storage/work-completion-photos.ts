import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "work-completion-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 3;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Структура bucket:
 * work-completion-photos/
 * └── {request_id}/
 *     └── {uuid}.{ext}
 */

export interface UploadResult {
  url: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Валидация файла изображения
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Зөвхөн зураг файл (JPEG, PNG, WebP, GIF) зөвшөөрнө`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Файл 5MB-ээс бага байх ёстой`;
  }
  return null;
}

/**
 * Валидация количества фотографий
 */
export function validatePhotosCount(currentCount: number): string | null {
  if (currentCount >= MAX_PHOTOS) {
    return `Хамгийн ихдээ ${MAX_PHOTOS} зураг оруулах боломжтой`;
  }
  return null;
}

/**
 * Загрузка фотографии завершенной работы
 */
export async function uploadWorkCompletionPhoto(
  requestId: string,
  file: File
): Promise<UploadResult> {
  const supabase = createClient();

  const validationError = validateImageFile(file);
  if (validationError) {
    return { url: null, path: null, error: validationError };
  }

  const uuid = crypto.randomUUID();
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${requestId}/${uuid}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("[WorkCompletionPhotos] Upload error:", error);
    return { url: null, path: null, error: error.message };
  }

  // Получаем публичный URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, path: filePath, error: null };
}

/**
 * Загрузка нескольких фотографий
 */
export async function uploadMultiplePhotos(
  requestId: string,
  files: File[]
): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];

  // Проверяем лимит
  if (files.length > MAX_PHOTOS) {
    return {
      urls: [],
      errors: [`Хамгийн ихдээ ${MAX_PHOTOS} зураг оруулах боломжтой`],
    };
  }

  for (const file of files) {
    const result = await uploadWorkCompletionPhoto(requestId, file);
    if (result.error) {
      errors.push(result.error);
    } else if (result.url) {
      urls.push(result.url);
    }
  }

  return { urls, errors };
}

/**
 * Удаление фотографии
 */
export async function deleteWorkCompletionPhoto(
  url: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Извлекаем путь из URL
  // URL: https://xxx.supabase.co/storage/v1/object/public/work-completion-photos/request_id/uuid.ext
  const urlParts = url.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
  if (urlParts.length !== 2) {
    return { error: "Буруу URL формат" };
  }

  const path = urlParts[1];

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    console.error("[WorkCompletionPhotos] Delete error:", error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Удаление всех фотографий заявки
 */
export async function deleteAllPhotosForRequest(
  requestId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Получаем список файлов в папке заявки
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(requestId);

  if (listError) {
    console.error("[WorkCompletionPhotos] List error:", listError);
    return { error: listError.message };
  }

  if (!files || files.length === 0) {
    return { error: null };
  }

  // Удаляем все файлы
  const paths = files.map((f: { name: string }) => `${requestId}/${f.name}`);
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths);

  if (deleteError) {
    console.error("[WorkCompletionPhotos] Delete error:", deleteError);
    return { error: deleteError.message };
  }

  return { error: null };
}
