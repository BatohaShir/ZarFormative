"use client";

import * as React from "react";
import { uploadListingImage } from "@/lib/storage/listings";
import { useBatchCreateImages } from "./use-batch-create-images";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import type { ImageFile } from "@/components/image-upload";

interface UploadedImage {
  url: string;
  sort_order: number;
  is_cover: boolean;
}

interface UseListingImagesOptions {
  userId: string;
  listingId: string;
  existingImagesCount?: number;
}

interface UseListingImagesReturn {
  uploadImages: (images: ImageFile[]) => Promise<UploadedImage[]>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

/**
 * Hook for uploading listing images with batch DB insert
 * Consolidates upload logic from 4 places into 1 reusable hook
 */
export function useListingImages({
  userId,
  listingId,
  existingImagesCount = 0,
}: UseListingImagesOptions): UseListingImagesReturn {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const batchCreateImages = useBatchCreateImages();

  const uploadImages = React.useCallback(async (images: ImageFile[]): Promise<UploadedImage[]> => {
    if (images.length === 0) return [];

    // Rate limit check
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.imageUpload);
    if (!rateLimitResult.allowed) {
      const resetInSeconds = Math.ceil(rateLimitResult.resetIn / 1000);
      throw new Error(`Хэт олон зураг оруулсан байна. ${resetInSeconds} секунд хүлээнэ үү.`);
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Parallel upload to storage
      const uploadResults = await Promise.all(
        images.map(async (image, i) => {
          const uuid = crypto.randomUUID();
          const { url, error: uploadError } = await uploadListingImage(
            userId,
            listingId,
            image.file,
            uuid
          );

          setUploadProgress((prev) => Math.min(prev + (50 / images.length), 50));

          if (uploadError || !url) {
            console.error(`Failed to upload image ${i}:`, uploadError);
            return null;
          }

          return {
            url,
            sort_order: existingImagesCount + i,
            is_cover: existingImagesCount === 0 && i === 0,
          };
        })
      );

      // Filter successful uploads
      const validImages = uploadResults.filter(
        (r): r is UploadedImage => r !== null
      );

      if (validImages.length === 0 && images.length > 0) {
        throw new Error("Зураг оруулахад алдаа гарлаа! Storage-д хандах эрх шалгана уу.");
      }

      setUploadProgress(75);

      // Batch insert to DB (1 query instead of N)
      if (validImages.length > 0) {
        await batchCreateImages.mutateAsync({
          listing_id: listingId,
          images: validImages,
        });
      }

      setUploadProgress(100);
      return validImages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Зураг оруулахад алдаа гарлаа";
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [userId, listingId, existingImagesCount, batchCreateImages]);

  return {
    uploadImages,
    isUploading,
    uploadProgress,
    error,
  };
}
