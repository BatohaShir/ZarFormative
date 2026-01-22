import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "chat-attachments";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Bucket is now public, no need for signed URLs

/**
 * Структура bucket:
 * chat-attachments/
 * └── {request_id}/
 *     └── {sender_id}/
 *         └── {uuid}.{ext}
 */

export interface UploadResult {
  publicUrl: string | null;
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
 * Загрузка изображения в чат
 */
export async function uploadChatAttachment(
  requestId: string,
  senderId: string,
  file: File
): Promise<UploadResult> {
  const supabase = createClient();

  const validationError = validateImageFile(file);
  if (validationError) {
    return { publicUrl: null, path: null, error: validationError };
  }

  const uuid = crypto.randomUUID();
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${requestId}/${senderId}/${uuid}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("[ChatStorage] Upload error:", error);
    return { publicUrl: null, path: null, error: error.message };
  }

  // Get public URL (bucket is public)
  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return { publicUrl: publicData.publicUrl, path: filePath, error: null };
}

/**
 * Получение public URL для существующего файла
 */
export function getPublicUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Удаление файла из чата
 */
export async function deleteChatAttachment(path: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    console.error("[ChatStorage] Delete error:", error);
    return { error: error.message };
  }
  return { error: null };
}
