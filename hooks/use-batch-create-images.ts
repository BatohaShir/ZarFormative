import { useCreateManylistings_images } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";

interface BatchImageData {
  url: string;
  alt?: string;
  sort_order: number;
  is_cover: boolean;
}

interface BatchCreateImagesParams {
  listing_id: string;
  images: BatchImageData[];
}

/**
 * Hook for batch creating listing images using ZenStack
 * Reduces N database queries to 1 for better performance
 */
export function useBatchCreateImages() {
  const queryClient = useQueryClient();
  const createMany = useCreateManylistings_images();

  return {
    ...createMany,
    mutateAsync: async (params: BatchCreateImagesParams) => {
      const result = await createMany.mutateAsync({
        data: params.images.map((img) => ({
          listing_id: params.listing_id,
          url: img.url,
          alt: img.alt || null,
          sort_order: img.sort_order,
          is_cover: img.is_cover,
        })),
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["listings_images"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });

      return {
        success: true,
        count: result.count,
      };
    },
  };
}
