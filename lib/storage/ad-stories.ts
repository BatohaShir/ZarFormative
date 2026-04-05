import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "ad-stories";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateStoryImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Зөвхөн JPG, PNG, WebP зураг оруулна уу`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Файлын хэмжээ ${MAX_FILE_SIZE / 1024 / 1024}MB-с хэтрэхгүй байх ёстой`;
  }
  return null;
}

export async function uploadStoryImage(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const validationError = validateStoryImage(file);
  if (validationError) return { url: null, error: validationError };

  const supabase = createClient();
  const ext = MIME_TO_EXTENSION[file.type] || "jpg";
  const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, { upsert: false });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  return { url: urlData.publicUrl, error: null };
}
