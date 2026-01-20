import { useMutation, useQueryClient } from "@tanstack/react-query";

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

interface BatchCreateImagesResponse {
  success: boolean;
  count: number;
}

/**
 * Hook for batch creating listing images
 * Reduces N database queries to 1 for better performance
 */
export function useBatchCreateImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BatchCreateImagesParams): Promise<BatchCreateImagesResponse> => {
      const response = await fetch("/api/listings/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create images");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["listings_images"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
