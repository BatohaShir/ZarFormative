"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload, ImageFile } from "@/components/image-upload";
import { LoginPromptModal } from "@/components/login-prompt-modal";

import { useCreatelistings } from "@/lib/hooks/listings";
import { useCreatelistings_images } from "@/lib/hooks/listings-images";
import { useFindManycategories } from "@/lib/hooks/categories";
import { useCurrentUser } from "@/hooks/use-current-user";
import { uploadListingImage } from "@/lib/storage/listings";
import { generateUniqueSlug } from "@/lib/utils/slug";


const listingSchema = z.object({
  title: z.string().min(5, "Минимум 5 символов").max(200, "Максимум 200 символов"),
  category_id: z.string().min(1, "Выберите категорию").or(z.literal("")).refine(val => val !== "", "Выберите категорию"),
  description: z.string().min(20, "Минимум 20 символов"),
  price: z.string().optional(),
  is_negotiable: z.boolean(),
  address: z.string().optional(),
});

type ListingFormData = z.infer<typeof listingSchema>;

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { data: allCategories } = useFindManycategories({
    orderBy: { sort_order: "asc" },
    include: {
      children: true,
    },
  });

  // Фильтруем только активные категории на клиенте
  const categories = React.useMemo(() => {
    if (!allCategories) return [];
    return allCategories.filter(cat => cat.is_active);
  }, [allCategories]);

  const createListing = useCreatelistings();
  const createListingImage = useCreatelistings_images();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      is_negotiable: false,
      category_id: "",
    },
  });

  const watchIsNegotiable = watch("is_negotiable");

  const onSubmit = async (data: ListingFormData) => {
    if (!user?.id) {
      alert("Необходимо войти в систему");
      return;
    }

    try {
      setIsSubmitting(true);

      // Генерируем slug
      const slug = generateUniqueSlug(data.title);

      // Создаём листинг
      const listing = await createListing.mutateAsync({
        data: {
          title: data.title,
          slug,
          description: data.description,
          category_id: data.category_id,
          user_id: user.id,
          address: data.address || null,
          price: data.price ? parseFloat(data.price) : null,
          is_negotiable: data.is_negotiable,
          status: "draft",
          is_active: true,
        },
      });

      if (!listing) {
        throw new Error("Не удалось создать объявление");
      }

      // Загружаем фото
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const uuid = crypto.randomUUID();

          // Загружаем в Storage
          const { url, error } = await uploadListingImage(
            user.id,
            listing.id,
            image.file,
            uuid
          );

          if (error || !url) {
            console.error("Ошибка загрузки фото:", error);
            continue;
          }

          // Создаём запись в БД
          await createListingImage.mutateAsync({
            data: {
              listing_id: listing.id,
              url,
              sort_order: i,
              is_cover: i === 0,
            },
          });
        }
      }

      alert("Объявление успешно создано!");
      router.push(`/listings/${listing.slug}`);
    } catch (error) {
      console.error("Ошибка создания объявления:", error);
      alert("Произошла ошибка при создании объявления");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="mb-4">Для создания объявления необходимо войти в систему.</p>
              <Button onClick={() => setShowLoginModal(true)}>
                Авторизоваться
              </Button>
            </CardContent>
          </Card>
        </div>
        <LoginPromptModal
          open={showLoginModal}
          onOpenChange={setShowLoginModal}
          onSuccess={() => {
            setShowLoginModal(false);
            window.location.reload();
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Создать объявление</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Заголовок */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Заголовок объявления <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Например: Услуги такси по городу"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Категория */}
            <div className="space-y-2">
              <Label htmlFor="category">
                Категория <span className="text-destructive">*</span>
              </Label>
              <Select onValueChange={(value) => setValue("category_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {!categories || categories.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Загрузка категорий...
                    </div>
                  ) : (
                    categories
                      .filter((category) => !category.parent_id)
                      .map((category) => (
                        <React.Fragment key={category.id}>
                          {/* Родительская категория */}
                          <SelectItem value={category.id} className="font-semibold">
                            {category.name}
                          </SelectItem>
                          {/* Дочерние категории */}
                          {category.children?.map((child) => (
                            <SelectItem key={child.id} value={child.id} className="pl-6">
                              └─ {child.name}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))
                  )}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Описание услуги <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Подробно опишите вашу услугу"
                rows={5}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Цена */}
            <div className="space-y-2">
              <Label htmlFor="price">Цена услуги (₮)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price")}
                placeholder="Оставьте пустым, если договорная"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            {/* Договорная цена */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_negotiable"
                checked={watchIsNegotiable}
                onCheckedChange={(checked) =>
                  setValue("is_negotiable", checked as boolean)
                }
              />
              <Label htmlFor="is_negotiable" className="cursor-pointer">
                Договорная цена
              </Label>
            </div>

            {/* Адрес */}
            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="Например: ул. Мира, 15"
              />
            </div>

            {/* Фотографии */}
            <div className="space-y-2">
              <Label>Фотографии (макс. 3 шт)</Label>
              <ImageUpload images={images} onChange={setImages} maxImages={3} />
            </div>

            {/* Кнопки */}
            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || images.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Создать объявление"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
