import { createClient } from "@/lib/supabase/client";

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
}

const BUCKET_NAME = "categories";

/**
 * Структура бакета categories:
 * categories/
 * ├── icons/                     # Иконки корневых категорий
 * │   ├── transport.png
 * │   ├── repair.png
 * │   └── ...
 * └── subcategories/             # Иконки подкатегорий
 *     ├── transport/
 *     │   ├── taxi.png
 *     │   └── delivery.png
 *     └── repair/
 *         ├── plumbing.png
 *         └── electrical.png
 */

export type CategoryIconType = "icon" | "subcategory";

/**
 * Получить публичный URL иконки категории
 */
export function getCategoryIconUrl(slug: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`icons/${slug}.png`);
  return data.publicUrl;
}

/**
 * Получить публичный URL иконки подкатегории
 */
export function getSubcategoryIconUrl(
  parentSlug: string,
  subcategorySlug: string
): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`subcategories/${parentSlug}/${subcategorySlug}.png`);
  return data.publicUrl;
}

/**
 * Загрузить иконку категории
 */
export async function uploadCategoryIcon(
  slug: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `icons/${slug}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Перезаписать если существует
    });

  if (error) {
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return { url: data.publicUrl, error: null };
}

/**
 * Загрузить иконку подкатегории
 */
export async function uploadSubcategoryIcon(
  parentSlug: string,
  subcategorySlug: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `subcategories/${parentSlug}/${subcategorySlug}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return { url: data.publicUrl, error: null };
}

/**
 * Удалить иконку категории
 */
export async function deleteCategoryIcon(
  slug: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Попробуем удалить с разными расширениями
  const extensions = ["png", "jpg", "jpeg", "webp", "svg", "gif"];
  const filePaths = extensions.map((ext) => `icons/${slug}.${ext}`);

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Удалить иконку подкатегории
 */
export async function deleteSubcategoryIcon(
  parentSlug: string,
  subcategorySlug: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const extensions = ["png", "jpg", "jpeg", "webp", "svg", "gif"];
  const filePaths = extensions.map(
    (ext) => `subcategories/${parentSlug}/${subcategorySlug}.${ext}`
  );

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Получить список всех иконок категорий
 */
export async function listCategoryIcons(): Promise<{
  files: string[];
  error: string | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list("icons", {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    return { files: [], error: error.message };
  }

  return {
    files: data?.map((f: StorageFile) => f.name) || [],
    error: null,
  };
}

/**
 * Получить список иконок подкатегорий для родительской категории
 */
export async function listSubcategoryIcons(parentSlug: string): Promise<{
  files: string[];
  error: string | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`subcategories/${parentSlug}`, {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    return { files: [], error: error.message };
  }

  return {
    files: data?.map((f: StorageFile) => f.name) || [],
    error: null,
  };
}
