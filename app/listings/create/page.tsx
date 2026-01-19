"use client";

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

import { useCreatelistings } from "@/lib/hooks/listings";
import { useCreatelistings_images } from "@/lib/hooks/listings-images";
import { useFindManycategories } from "@/lib/hooks/categories";
import { useCurrentUser } from "@/hooks/use-current-user";
import { uploadListingImage } from "@/lib/storage/listings";
import { generateUniqueSlug } from "@/lib/utils/slug";

const cities = [
  "Улаанбаатар",
  "Эрдэнэт",
  "Дархан",
  "Чойбалсан",
  "Мөрөн",
  "Ховд",
  "Өлгий",
  "Улиастай",
];

const listingSchema = z.object({
  title: z.string().min(5, "Минимум 5 символов").max(200, "Максимум 200 символов"),
  category_id: z.string().min(1, "Выберите категорию"),
  description: z.string().min(20, "Минимум 20 символов"),
  price: z.string().optional(),
  is_negotiable: z.boolean(),
  city: z.string().min(1, "Выберите город"),
  district: z.string().optional(),
  address: z.string().optional(),
});

type ListingFormData = z.infer<typeof listingSchema>;

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories } = useFindManycategories({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });

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
          city: data.city,
          district: data.district || null,
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
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Необходимо войти в систему для создания объявления</p>
            <Button onClick={() => router.push("/auth/signin")} className="mt-4">
              Войти
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
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
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
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

            {/* Город */}
            <div className="space-y-2">
              <Label htmlFor="city">
                Город <span className="text-destructive">*</span>
              </Label>
              <Select onValueChange={(value) => setValue("city", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите город" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            {/* Район */}
            <div className="space-y-2">
              <Label htmlFor="district">Район</Label>
              <Input
                id="district"
                {...register("district")}
                placeholder="Например: Сүхбаатар"
              />
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
