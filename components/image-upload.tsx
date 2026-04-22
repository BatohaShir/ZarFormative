"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { toast } from "sonner";
import { compressImage, formatBytes } from "@/lib/image-compression";

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  sortOrder: number;
  /**
   * Background upload progress. When the parent wires onUpload, each
   * newly added image can start uploading in the background before
   * the user hits submit — by the time they do, the URL is already
   * in storage and we skip the wait.
   */
  uploadPromise?: Promise<{ url: string | null; error: string | null }>;
  uploadedUrl?: string;
  uploadError?: string;
}

interface ImageUploadProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  /** Enable image compression (default: true) */
  compress?: boolean;
  /** Max dimension for compression (default: 1920) */
  maxDimension?: number;
  /** Compression quality 0-1 (default: 0.85) */
  compressionQuality?: number;
  /**
   * Called once per freshly-compressed file. The parent is expected to
   * kick off a background upload and return the resulting promise;
   * we attach it to the ImageFile so that submit can just await the
   * already-inflight work instead of starting uploads at submit time.
   */
  onUpload?: (file: File) => Promise<{ url: string | null; error: string | null }>;
}

export function ImageUpload({
  images,
  onChange,
  maxImages = 3,
  maxSizeMB = 5,
  compress = true,
  maxDimension = 1920,
  compressionQuality = 0.85,
  onUpload,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup blob URLs when component unmounts or images change
  // This prevents memory leaks from orphaned object URLs
  useEffect(() => {
    return () => {
      // Revoke all blob URLs on unmount
      images.forEach((img) => {
        if (img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []); // Only on unmount

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    // Pre-validate synchronously so toast errors fire immediately,
    // not after compression kicks off.
    const validated = filesToAdd.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} зураг биш байна`);
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} ${maxSizeMB}MB-ээс их байна`);
        return false;
      }
      return true;
    });

    if (validated.length === 0) return;

    if (compress) {
      setIsCompressing(true);
      setCompressionProgress(`0/${validated.length}`);
    }

    // Compress in parallel. Each compressImage does its own canvas
    // work off the critical path, and small images short-circuit to
    // the original file. Was a serial for-loop before (3 × 300ms =
    // ~900ms); parallel brings it closer to ~300ms total.
    let doneCount = 0;
    const tick = () => {
      doneCount++;
      setCompressionProgress(`${doneCount}/${validated.length}`);
    };

    const processed = await Promise.all(
      validated.map(async (file) => {
        if (!compress) {
          tick();
          return file;
        }
        try {
          const result = await compressImage(file, {
            maxWidth: maxDimension,
            maxHeight: maxDimension,
            quality: compressionQuality,
            outputFormat: "webp",
          });
          if (result.compressionRatio < 0.8) {
            const savings = Math.round((1 - result.compressionRatio) * 100);
            console.log(
              `[ImageUpload] Compressed: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${savings}% savings)`
            );
          }
          tick();
          return result.file;
        } catch (err) {
          console.error("[ImageUpload] Compression error:", err);
          tick();
          return file;
        }
      })
    );

    setIsCompressing(false);
    setCompressionProgress("");

    const newImages: ImageFile[] = processed.map((processedFile, i) => {
      const id = Math.random().toString(36).substring(7);
      const preview = URL.createObjectURL(processedFile);

      // Kick off background upload NOW, not at submit time. By the
      // time the user finishes the form, the file is already in
      // Supabase Storage and submit just needs to wait on the DB
      // INSERT (or nothing, if the promise already resolved).
      const uploadPromise = onUpload?.(processedFile);

      return {
        id,
        file: processedFile,
        preview,
        sortOrder: images.length + i,
        uploadPromise,
      };
    });

    onChange([...images, ...newImages]);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeImage = (id: string) => {
    const imageToRemove = images.find((img) => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    onChange(images.filter((img) => img.id !== id));
  };

  const onDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const onDragOverItem = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];

    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);

    // Обновляем sortOrder
    newImages.forEach((img, idx) => {
      img.sortOrder = idx;
    });

    setDraggedIndex(index);
    onChange(newImages);
  };

  const onDragEndItem = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOverItem(e, index)}
              onDragEnd={onDragEndItem}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-move ${
                draggedIndex === index ? "opacity-50" : ""
              } ${index === 0 ? "border-primary" : "border-border"}`}
            >
              <Image
                src={image.preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
              />
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Нүүр зураг
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {index + 1}/{images.length}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={isCompressing}
          />

          <div className="flex flex-col items-center gap-2">
            {isCompressing ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-primary">
                    Зураг шахаж байна... {compressionProgress}
                  </p>
                  <p className="text-xs text-muted-foreground">Хүлээнэ үү</p>
                </div>
              </>
            ) : images.length === 0 ? (
              <>
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Зураг чирж оруулах эсвэл дарж сонгоно уу</p>
                  <p className="text-xs text-muted-foreground">
                    {images.length}/{maxImages} зураг • Дээд хэмжээ {maxSizeMB}MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Файл сонгох
                </Button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Дахиж {maxImages - images.length} зураг нэмнэ үү
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {images.length}/{maxImages} зураг • Дээд хэмжээ {maxSizeMB}MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Файл сонгох
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Дарааллыг өөрчлөхийн тулд зургийг чирнэ үү. Эхний зураг нүүр зураг болно.
        </p>
      )}
    </div>
  );
}
