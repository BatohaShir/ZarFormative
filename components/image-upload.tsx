"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { toast } from "sonner";

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  sortOrder: number;
}

interface ImageUploadProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
}

export function ImageUpload({
  images,
  onChange,
  maxImages = 3,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
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

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    const newImages: ImageFile[] = [];

    filesToAdd.forEach((file) => {
      // Валидация типа
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} зураг биш байна`);
        return;
      }

      // Валидация размера
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} ${maxSizeMB}MB-ээс их байна`);
        return;
      }

      const id = Math.random().toString(36).substring(7);
      const preview = URL.createObjectURL(file);

      newImages.push({
        id,
        file,
        preview,
        sortOrder: images.length + newImages.length,
      });
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
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center gap-2">
            {images.length === 0 ? (
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}

            <div className="space-y-1">
              <p className="text-sm font-medium">
                {images.length === 0
                  ? "Зураг чирж оруулах эсвэл дарж сонгоно уу"
                  : `Дахиж ${maxImages - images.length} зураг нэмнэ үү`}
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
