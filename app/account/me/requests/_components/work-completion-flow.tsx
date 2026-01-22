"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  X,
  Star,
  Loader2,
  Camera,
  CheckCircle,
  FileText,
  CreditCard,
  Upload,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  uploadWorkCompletionPhoto,
  deleteWorkCompletionPhoto,
  validateImageFile,
} from "@/lib/storage/work-completion-photos";
import type { RequestWithRelations } from "./types";

// ============================================
// Step 1: Client Review Form
// Клиент подтверждает завершение и пишет отзыв
// ============================================

interface ClientReviewFormProps {
  request: RequestWithRelations;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export function ClientReviewForm({
  request,
  onSubmit,
  onClose,
  isSubmitting,
}: ClientReviewFormProps) {
  const [rating, setRating] = React.useState(5);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [comment, setComment] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(rating, comment);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-md rounded-xl shadow-xl">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold">Ажил дуусгахыг баталгаажуулах</h3>
              <p className="text-sm text-muted-foreground">
                Үйлчилгээ үзүүлэгчид үнэлгээ өгнө үү
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Rating Stars */}
          <div className="space-y-2">
            <Label>Үнэлгээ</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating} / 5
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="review-comment">Сэтгэгдэл (заавал биш)</Label>
            <Textarea
              id="review-comment"
              placeholder="Үйлчилгээний талаар сэтгэгдэл бичнэ үү..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length} / 500
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Болих
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Баталгаажуулах
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Step 2: Provider Completion Details Form
// Исполнитель заполняет описание работ и фото
// ============================================

interface ProviderCompletionFormProps {
  request: RequestWithRelations;
  onSubmit: (description: string, photoUrls: string[]) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export function ProviderCompletionForm({
  request,
  onSubmit,
  onClose,
  isSubmitting,
}: ProviderCompletionFormProps) {
  const [description, setDescription] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check limit
    if (photos.length + files.length > 3) {
      toast.error("Хамгийн ихдээ 3 зураг оруулах боломжтой");
      return;
    }

    setUploading(true);

    for (const file of Array.from(files)) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }

      const result = await uploadWorkCompletionPhoto(request.id, file);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        setPhotos((prev) => [...prev, result.url!]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async (url: string) => {
    const result = await deleteWorkCompletionPhoto(url);
    if (result.error) {
      toast.error(result.error);
    } else {
      setPhotos((prev) => prev.filter((p) => p !== url));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Хийсэн ажлын тайлбар бичнэ үү");
      return;
    }
    await onSubmit(description, photos);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-lg rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Хийсэн ажлын тайлан</h3>
              <p className="text-sm text-muted-foreground">
                Ажлын тайлбар болон зураг оруулна уу
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="work-description">Хийсэн ажлын тайлбар *</Label>
            <Textarea
              id="work-description"
              placeholder="Хийсэн ажлын талаар дэлгэрэнгүй бичнэ үү..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={1000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length} / 1000
            </p>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Ажлын зураг (заавал биш, хамгийн ихдээ 3)</Label>

            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-lg overflow-hidden group"
                >
                  <Image
                    src={url}
                    alt="Ажлын зураг"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Upload button */}
              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-6 w-6" />
                      <span className="text-xs">Зураг</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 border-t p-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting || uploading}
          >
            Болих
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting || uploading || !description.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Илгээх
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Step 3: QR Payment Modal
// Показ тестового QR кода для оплаты
// ============================================

interface QRPaymentModalProps {
  request: RequestWithRelations;
  onPaymentComplete: () => Promise<void>;
  onClose: () => void;
  isProcessing: boolean;
}

export function QRPaymentModal({
  request,
  onPaymentComplete,
  onClose,
  isProcessing,
}: QRPaymentModalProps) {
  const [countdown, setCountdown] = React.useState(10);
  const [canComplete, setCanComplete] = React.useState(false);

  // Countdown timer for test mode
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanComplete(true);
    }
  }, [countdown]);

  // Format price
  const formattedPrice = request.listing.price
    ? new Intl.NumberFormat("mn-MN").format(Number(request.listing.price))
    : "—";

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-xl shadow-xl">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">Төлбөр төлөх</h3>
              <p className="text-sm text-muted-foreground">QR код уншуулна уу</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Price */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Төлөх дүн</p>
            <p className="text-3xl font-bold text-primary">
              {formattedPrice}₮
            </p>
          </div>

          {/* QR Code Placeholder */}
          <div className="aspect-square max-w-48 mx-auto bg-white p-4 rounded-xl shadow-inner">
            {/* Test QR - using a simple pattern */}
            <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-700 to-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* QR pattern simulation */}
              <div className="absolute inset-2 grid grid-cols-8 gap-0.5">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square ${
                      Math.random() > 0.5 ? "bg-white" : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
              {/* Center logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-lg font-bold text-gray-900">₮</span>
                </div>
              </div>
            </div>
          </div>

          {/* Test mode indicator */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
              <span className="font-semibold">Туршилтын горим:</span> QR код нь
              туршилтын зорилгоор хэрэглэгдэж байна
            </p>
          </div>

          {/* Countdown or complete button */}
          {!canComplete ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Төлбөр хүлээж байна...
              </p>
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <span className="text-2xl font-bold">{countdown}</span>
              </div>
            </div>
          ) : (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={onPaymentComplete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Төлбөр төлөгдлөө
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Completion Success Modal
// Показывается после успешного завершения
// ============================================

interface CompletionSuccessModalProps {
  isProvider: boolean;
  onClose: () => void;
}

export function CompletionSuccessModal({
  isProvider,
  onClose,
}: CompletionSuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-xl shadow-xl p-6 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>

        {/* Message */}
        <h3 className="text-xl font-bold mb-2">
          {isProvider ? "Ажил амжилттай дууслаа!" : "Ажил дууссаныг баталлаа!"}
        </h3>
        <p className="text-muted-foreground mb-6">
          {isProvider
            ? "Та ажлыг амжилттай дуусгалаа. Баярлалаа!"
            : "Үйлчилгээ үзүүлэгчид баярлалаа!"}
        </p>

        {/* Close button */}
        <Button className="w-full" onClick={onClose}>
          Хаах
        </Button>
      </div>
    </div>
  );
}
