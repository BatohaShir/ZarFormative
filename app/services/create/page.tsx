"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  ChevronLeft,
  FileText,
  Tag,
  AlignLeft,
  MapPin,
  ImageIcon,
  Plus,
  Save,
  X,
  Edit3,
  Trash2,
  AlertCircle,
  Clock,
  CalendarClock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload, ImageFile } from "@/components/image-upload";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";

// Типы для модальных окон (импортируем только типы для TypeScript)
import type { AddressData } from "@/components/address-select-modal";
import type { CategoryData } from "@/components/category-select-modal";

// Lazy load модальных окон - не загружаются до открытия (~30KB экономии)
const AddressSelectModal = dynamic(
  () => import("@/components/address-select-modal").then((mod) => ({ default: mod.AddressSelectModal })),
  { ssr: false }
);
const CategorySelectModal = dynamic(
  () => import("@/components/category-select-modal").then((mod) => ({ default: mod.CategorySelectModal })),
  { ssr: false }
);

import { useCreatelistings, useFindManylistings, useUpdatelistings, useDeletelistings } from "@/lib/hooks/listings";
import { useDeletelistings_images } from "@/lib/hooks/listings-images";
import { useFindManycategories } from "@/lib/hooks/categories";
import { useCurrentUser } from "@/hooks/use-current-user";
import { uploadListingImage, deleteAllListingImages } from "@/lib/storage/listings";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { useBatchCreateImages } from "@/hooks/use-batch-create-images";
import { toast } from "sonner";


// Sanitize input: trim whitespace, normalize spaces, remove control characters
const sanitizeText = (value: string) =>
  value
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " "); // Normalize whitespace

const listingSchema = z.object({
  title: z
    .string()
    .min(1, "Гарчиг оруулна уу")
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(5, "Хамгийн багадаа 5 тэмдэгт")
        .max(200, "Хамгийн ихдээ 200 тэмдэгт")
        .regex(/^[^<>{}[\]]*$/, "Тусгай тэмдэгт ашиглах боломжгүй")
    ),
  category_id: z
    .string()
    .min(1, "Ангилал сонгоно уу")
    .or(z.literal(""))
    .refine(val => val !== "", "Ангилал сонгоно уу")
    .refine(val => !val || /^[a-zA-Z0-9-_]+$/.test(val), "Ангилал ID буруу"),
  description: z
    .string()
    .min(1, "Тайлбар оруулна уу")
    .transform(sanitizeText)
    .pipe(
      z.string()
        .min(20, "Хамгийн багадаа 20 тэмдэгт")
        .max(5000, "Хамгийн ихдээ 5000 тэмдэгт")
        .regex(/^[^<>{}[\]]*$/, "Тусгай тэмдэгт ашиглах боломжгүй")
    ),
  price: z
    .string()
    .transform(val => val?.trim() || "")
    .refine(
      val => !val || (/^\d+(\.\d{1,2})?$/.test(val) && Number(val) >= 0 && Number(val) <= 999999999),
      "Үнэ буруу форматтай (0-999,999,999)"
    ),
  is_negotiable: z.boolean(),
  duration_minutes: z
    .string()
    .transform(val => val?.trim() || "")
    .refine(
      val => !val || (/^\d+$/.test(val) && Number(val) >= 15 && Number(val) <= 1440),
      "Хугацаа 15-1440 минутын хооронд байх ёстой"
    ),
  work_hours_start: z
    .string()
    .transform(val => val || "09:00")
    .pipe(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Формат: HH:mm")),
  work_hours_end: z
    .string()
    .transform(val => val || "18:00")
    .pipe(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Формат: HH:mm")),
}).refine(
  data => {
    const [startH, startM] = data.work_hours_start.split(":").map(Number);
    const [endH, endM] = data.work_hours_end.split(":").map(Number);
    return (startH * 60 + startM) < (endH * 60 + endM);
  },
  { message: "Дуусах цаг эхлэх цагаас хойш байх ёстой", path: ["work_hours_end"] }
);

type ListingFormData = z.infer<typeof listingSchema>;

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(true);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // Fetch user's draft listings
  const { data: drafts, refetch: refetchDrafts } = useFindManylistings(
    user?.id ? {
      where: {
        user_id: user.id,
        status: "draft",
      },
      include: {
        category: true,
        images: true,
      },
      orderBy: { updated_at: "desc" },
    } : undefined,
    { enabled: !!user?.id }
  );

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
  const updateListing = useUpdatelistings();
  const deleteListing = useDeletelistings();
  const batchCreateImages = useBatchCreateImages();
  const deleteListingImage = useDeletelistings_images();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      category_id: "",
      description: "",
      price: "",
      is_negotiable: false,
      duration_minutes: "",
      work_hours_start: "09:00",
      work_hours_end: "18:00",
    },
  });

  const watchIsNegotiable = watch("is_negotiable");

  // Форматирование цены с разделителями тысяч
  const [displayPrice, setDisplayPrice] = useState("");

  const formatPriceDisplay = (value: string) => {
    // Убираем всё кроме цифр
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    // Форматируем с разделителями
    return Number(numericValue).toLocaleString("mn-MN");
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setDisplayPrice(formatPriceDisplay(rawValue));
    // Сохраняем чистое число в форму
    setValue("price", rawValue);
  };

  // Show login modal if not authenticated
  React.useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    window.location.reload();
  };

  const handleLoginModalClose = (open: boolean) => {
    if (!open && !user) {
      router.push("/");
    } else {
      setShowLoginModal(open);
    }
  };

  // Обработчик выбора категории
  const handleCategorySelect = (category: CategoryData) => {
    setSelectedCategory(category);
    setValue("category_id", category.id);
  };

  // Форматирование адреса для отображения
  const formatAddress = (address: AddressData | null) => {
    if (!address) return null;
    return [address.city, address.district, address.khoroo].join(", ");
  };

  // Загрузить черновик для редактирования
  const loadDraft = (draft: typeof drafts extends (infer T)[] | undefined ? T : never) => {
    if (!draft) return;

    setEditingDraftId(draft.id);
    setShowDraftBanner(false);

    // Заполняем форму данными черновика
    const priceValue = draft.price ? String(draft.price) : "";
    reset({
      title: draft.title || "",
      description: draft.description || "",
      category_id: draft.category_id || "",
      price: priceValue,
      is_negotiable: draft.is_negotiable || false,
      duration_minutes: draft.duration_minutes ? String(draft.duration_minutes) : "",
      work_hours_start: draft.work_hours_start || "09:00",
      work_hours_end: draft.work_hours_end || "18:00",
    });
    setDisplayPrice(formatPriceDisplay(priceValue));

    // Устанавливаем категорию
    if (draft.category) {
      const cat = draft.category as typeof categories[0];
      setSelectedCategory({
        id: cat.id,
        name: cat.name,
        parentName: cat.parent_id ? categories.find(c => c.id === cat.parent_id)?.name : undefined,
      });
    }

    // Устанавливаем адрес
    if (draft.aimag_id && draft.district_id && draft.khoroo_id) {
      setSelectedAddress({
        city: draft.address?.split(", ")[0] || "",
        cityId: draft.aimag_id,
        district: draft.address?.split(", ")[1] || "",
        districtId: draft.district_id,
        khoroo: draft.address?.split(", ")[2] || "",
        khorooId: draft.khoroo_id,
      });
    }

    // Изображения из черновика (их URL уже в storage)
    // Не загружаем их в images state, так как они уже сохранены
    // Просто будем добавлять новые при редактировании
  };

  // Удалить черновик
  const handleDeleteDraft = async (draftId: string) => {
    try {
      setDeletingDraftId(draftId);

      // Сначала удаляем изображения из storage
      const draftToDelete = drafts?.find(d => d.id === draftId);
      if (draftToDelete?.images && user?.id) {
        await deleteAllListingImages(user.id, draftId);
      }

      // Удаляем сам черновик
      await deleteListing.mutateAsync({ where: { id: draftId } });

      // Обновляем список черновиков
      refetchDrafts();

      // Если удалили текущий редактируемый черновик - сбрасываем форму
      if (editingDraftId === draftId) {
        setEditingDraftId(null);
        reset({
          title: "",
          description: "",
          category_id: "",
          price: "",
          is_negotiable: false,
          duration_minutes: "",
          work_hours_start: "09:00",
          work_hours_end: "18:00",
        });
        setSelectedCategory(null);
        setSelectedAddress(null);
        setImages([]);
        setDisplayPrice("");
      }
    } catch (error) {
      console.error("Черновик устгахад алдаа:", error);
    } finally {
      setDeletingDraftId(null);
    }
  };

  // Сохранить как черновик
  const saveDraft = async () => {
    if (!user?.id) return;

    const data = getValues();

    // Минимальная валидация для черновика - только title
    if (!data.title || data.title.length < 3) {
      toast.error("Гарчиг хамгийн багадаа 3 тэмдэгт байх ёстой");
      return;
    }

    try {
      setIsSavingDraft(true);

      const slug = generateUniqueSlug(data.title);
      const addressStr = formatAddress(selectedAddress);

      if (editingDraftId) {
        // Обновляем существующий черновик
        await updateListing.mutateAsync({
          where: { id: editingDraftId },
          data: {
            title: data.title,
            slug,
            description: data.description || "",
            ...(data.category_id && { category_id: data.category_id }),
            address: addressStr,
            aimag_id: selectedAddress?.cityId || null,
            district_id: selectedAddress?.districtId || null,
            khoroo_id: selectedAddress?.khorooId || null,
            price: data.price ? parseFloat(data.price) : null,
            is_negotiable: data.is_negotiable,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            work_hours_start: data.work_hours_start || "09:00",
            work_hours_end: data.work_hours_end || "18:00",
          },
        });

        // Загружаем новые фото если есть (batch upload + batch DB insert)
        if (images.length > 0) {
          // Параллельная загрузка файлов в storage
          const uploadResults = await Promise.all(
            images.map(async (image, i) => {
              const uuid = crypto.randomUUID();
              const { url, error } = await uploadListingImage(user.id, editingDraftId, image.file, uuid);
              if (error || !url) return null;
              return { url, sort_order: i, is_cover: i === 0 };
            })
          );

          // Batch insert в БД (1 запрос вместо N)
          const validImages = uploadResults.filter((r): r is { url: string; sort_order: number; is_cover: boolean } => r !== null);
          if (validImages.length > 0) {
            await batchCreateImages.mutateAsync({
              listing_id: editingDraftId,
              images: validImages,
            });
          }
        }
      } else {
        // Создаём новый черновик
        const listing = await createListing.mutateAsync({
          data: {
            title: data.title,
            slug,
            description: data.description || "",
            ...(data.category_id && { category_id: data.category_id }),
            user_id: user.id,
            address: addressStr,
            aimag_id: selectedAddress?.cityId || null,
            district_id: selectedAddress?.districtId || null,
            khoroo_id: selectedAddress?.khorooId || null,
            price: data.price ? parseFloat(data.price) : null,
            is_negotiable: data.is_negotiable,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            work_hours_start: data.work_hours_start || "09:00",
            work_hours_end: data.work_hours_end || "18:00",
            status: "draft",
            is_active: false,
          },
        });

        if (listing && images.length > 0) {
          // Параллельная загрузка файлов в storage
          const uploadResults = await Promise.all(
            images.map(async (image, i) => {
              const uuid = crypto.randomUUID();
              const { url, error } = await uploadListingImage(user.id, listing.id, image.file, uuid);
              if (error || !url) return null;
              return { url, sort_order: i, is_cover: i === 0 };
            })
          );

          // Batch insert в БД (1 запрос вместо N)
          const validImages = uploadResults.filter((r): r is { url: string; sort_order: number; is_cover: boolean } => r !== null);
          if (validImages.length > 0) {
            await batchCreateImages.mutateAsync({
              listing_id: listing.id,
              images: validImages,
            });
          }
        }

        setEditingDraftId(listing?.id || null);
      }

      // Сбрасываем изображения (они уже загружены)
      setImages([]);
      refetchDrafts();

      toast.success("Черновик хадгалагдлаа!");
    } catch (error) {
      console.error("Черновик хадгалахад алдаа:", error);
      toast.error("Черновик хадгалахад алдаа гарлаа");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const onSubmit = async (data: ListingFormData) => {
    if (!user?.id) {
      toast.error("Нэвтрэх шаардлагатай");
      return;
    }

    try {
      setIsSubmitting(true);

      const slug = generateUniqueSlug(data.title);
      const addressStr = formatAddress(selectedAddress);

      let listingId: string;
      let listingSlug: string;

      if (editingDraftId) {
        // Публикуем существующий черновик
        const updated = await updateListing.mutateAsync({
          where: { id: editingDraftId },
          data: {
            title: data.title,
            slug,
            description: data.description,
            category_id: data.category_id,
            address: addressStr,
            aimag_id: selectedAddress?.cityId || null,
            district_id: selectedAddress?.districtId || null,
            khoroo_id: selectedAddress?.khorooId || null,
            price: data.price ? parseFloat(data.price) : null,
            is_negotiable: data.is_negotiable,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            work_hours_start: data.work_hours_start || "09:00",
            work_hours_end: data.work_hours_end || "18:00",
            status: "active",
            is_active: true,
            published_at: new Date(),
          },
        });

        listingId = editingDraftId;
        listingSlug = updated?.slug || slug;

        // Загружаем новые фото если есть (batch upload + batch DB insert)
        if (images.length > 0) {
          const existingImages = drafts?.find(d => d.id === editingDraftId)?.images?.length || 0;

          // Параллельная загрузка файлов в storage
          const uploadResults = await Promise.all(
            images.map(async (image, i) => {
              const uuid = crypto.randomUUID();
              const { url, error } = await uploadListingImage(user.id, listingId, image.file, uuid);
              if (error || !url) return null;
              return { url, sort_order: existingImages + i, is_cover: existingImages === 0 && i === 0 };
            })
          );

          // Batch insert в БД (1 запрос вместо N)
          const validImages = uploadResults.filter((r): r is { url: string; sort_order: number; is_cover: boolean } => r !== null);
          if (validImages.length > 0) {
            await batchCreateImages.mutateAsync({
              listing_id: listingId,
              images: validImages,
            });
          }
        }
      } else {
        // Создаём новый листинг
        const listing = await createListing.mutateAsync({
          data: {
            title: data.title,
            slug,
            description: data.description,
            category_id: data.category_id,
            user_id: user.id,
            address: addressStr,
            aimag_id: selectedAddress?.cityId || null,
            district_id: selectedAddress?.districtId || null,
            khoroo_id: selectedAddress?.khorooId || null,
            price: data.price ? parseFloat(data.price) : null,
            is_negotiable: data.is_negotiable,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            work_hours_start: data.work_hours_start || "09:00",
            work_hours_end: data.work_hours_end || "18:00",
            status: "active",
            is_active: true,
            published_at: new Date(),
          },
        });

        if (!listing) {
          throw new Error("Зар үүсгэж чадсангүй");
        }

        listingId = listing.id;
        listingSlug = listing.slug;

        // Загружаем фото параллельно (batch upload + batch DB insert)
        if (images.length > 0) {
          // Параллельная загрузка файлов в storage
          const uploadResults = await Promise.all(
            images.map(async (image, i) => {
              const uuid = crypto.randomUUID();
              const { url, error } = await uploadListingImage(user.id, listingId, image.file, uuid);
              if (error || !url) {
                return null;
              }
              return { url, sort_order: i, is_cover: i === 0 };
            })
          );

          // Batch insert в БД (1 запрос вместо N)
          const validImages = uploadResults.filter((r): r is { url: string; sort_order: number; is_cover: boolean } => r !== null);

          if (validImages.length === 0 && images.length > 0) {
            throw new Error("Зураг оруулахад алдаа гарлаа! Storage-д хандах эрх шалгана уу.");
          }

          if (validImages.length > 0) {
            await batchCreateImages.mutateAsync({
              listing_id: listingId,
              images: validImages,
            });
          }
        }
      }

      router.push(`/services/${listingSlug}`);
    } catch (error) {
      console.error("Зар үүсгэхэд алдаа:", error);
      toast.error("Зар үүсгэхэд алдаа гарлаа");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 mx-auto mb-6">
              <Plus className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Нэвтэрнэ үү</h2>
            <p className="text-muted-foreground text-sm">
              Зар нэмэхийн тулд нэвтрэх шаардлагатай
            </p>
          </div>
        </div>
        <LoginPromptModal
          open={showLoginModal}
          onOpenChange={handleLoginModalClose}
          onSuccess={handleLoginSuccess}
          title="Зар нэмэхийн тулд нэвтэрнэ үү"
          description="Шинэ зар нэмэхийн тулд эхлээд нэвтрэх шаардлагатай."
          icon={Plus}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
            <Link href="/">
              <h1 className="text-lg md:text-2xl font-bold">
                <span className="text-[#c4272f]">Uilc</span>
                <span className="text-[#015197]">hilge</span>
                <span className="text-[#c4272f]">e.mn</span>
              </h1>
            </Link>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <RequestsButton />
            <FavoritesButton />
            <ThemeToggle />
            <AuthModal />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Page Title */}
        <div className="flex items-center gap-4 mb-6 md:mb-8 max-w-5xl mx-auto">
          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            {editingDraftId ? (
              <Edit3 className="h-6 w-6 md:h-7 md:w-7 text-white" />
            ) : (
              <Plus className="h-6 w-6 md:h-7 md:w-7 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold">
              {editingDraftId ? "Черновик засах" : "Шинэ зар"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {editingDraftId ? "Черновикоо засаад нийтлэнэ үү" : "Үйлчилгээний мэдээллээ оруулна уу"}
            </p>
          </div>
        </div>

        {/* Draft Banner */}
        {showDraftBanner && drafts && drafts.length > 0 && !editingDraftId && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Танд {drafts.length} черновик байна
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Өмнө хадгалсан зараа үргэлжлүүлэх үү?
                  </p>

                  {/* Draft list */}
                  <div className="mt-3 space-y-2">
                    {drafts.slice(0, 3).map((draft) => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between gap-2 bg-white dark:bg-background rounded-lg p-2.5 border border-amber-200 dark:border-amber-800"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{draft.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {draft.category?.name || "Ангилалгүй"} •{" "}
                            {new Date(draft.updated_at).toLocaleDateString("mn-MN")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
                            onClick={() => loadDraft(draft)}
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Үргэлжлүүлэх
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                            onClick={() => handleDeleteDraft(draft.id)}
                            disabled={deletingDraftId === draft.id}
                          >
                            {deletingDraftId === draft.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {drafts.length > 3 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      + {drafts.length - 3} бусад черновик
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => setShowDraftBanner(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Editing draft indicator */}
        {editingDraftId && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    Черновик засаж байна
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                  onClick={() => {
                    setEditingDraftId(null);
                    reset({
                      title: "",
                      description: "",
                      category_id: "",
                      price: "",
                      is_negotiable: false,
                      duration_minutes: "",
                      work_hours_start: "09:00",
                      work_hours_end: "18:00",
                    });
                    setSelectedCategory(null);
                    setSelectedAddress(null);
                    setImages([]);
                    setDisplayPrice("");
                    setShowDraftBanner(true);
                  }}
                >
                  Шинэ зар үүсгэх
                </Button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-5">
          {/* Основная информация */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Үндсэн мэдээлэл</h3>
                  <p className="text-xs text-muted-foreground">Зарын гарчиг болон тайлбар</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Заголовок */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Гарчиг <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="Жишээ: Гэр цэвэрлэх үйлчилгээ"
                  className="h-12 text-base"
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Описание */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Тайлбар <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Үйлчилгээний дэлгэрэнгүй мэдээллийг бичнэ үү. Ямар ажил хийх, туршлага, үнэ гэх мэт..."
                  rows={5}
                  className="resize-none text-base"
                />
                {errors.description && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ангилал, Байршил - Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 items-stretch">
            {/* Ангилал */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <Tag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-h-10 flex flex-col justify-center">
                  <h3 className="font-semibold text-sm leading-tight">Ангилал <span className="text-destructive">*</span></h3>
                  <p className="text-xs text-muted-foreground leading-tight">Төрөл сонгох</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 justify-start text-left font-normal overflow-hidden"
                  onClick={() => setShowCategoryModal(true)}
                >
                  {selectedCategory ? (
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                      <span className="truncate font-medium">
                        {selectedCategory.name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Сонгоно уу...</span>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center py-1.5 h-8 flex items-center justify-center">
                  Хайлтад нөлөөлнө
                </p>
              </div>
              {errors.category_id && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                  <AlertCircle className="h-3 w-3" />
                  {errors.category_id.message}
                </p>
              )}
            </div>

            {/* Байршил */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-h-10 flex flex-col justify-center">
                  <h3 className="font-semibold text-sm leading-tight">Байршил</h3>
                  <p className="text-xs text-muted-foreground leading-tight">Хаана байрлах</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 justify-start text-left font-normal"
                  onClick={() => setShowAddressModal(true)}
                >
                  {selectedAddress ? (
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate font-medium">
                        {selectedAddress.district}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Сонгоно уу...</span>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center py-1.5 h-8 flex items-center justify-center">
                  Үйлчилгээний газар
                </p>
              </div>
            </div>
          </div>

          {/* Хугацаа, Ажлын цаг, Үнэ - Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Хугацаа (Длительность) */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Хугацаа</h3>
                  <p className="text-xs text-muted-foreground">Гүйцэтгэх хугацаа</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <div className="relative">
                  <Input
                    id="duration_minutes"
                    type="number"
                    step="15"
                    min="15"
                    max="1440"
                    {...register("duration_minutes")}
                    placeholder="60"
                    className="h-11 pr-14 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                    мин
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center py-1.5">
                  Цагийн хуваарьт ашиглана
                </p>
              </div>
              {errors.duration_minutes && (
                <p className="text-xs text-destructive mt-2">{errors.duration_minutes.message}</p>
              )}
            </div>

            {/* Ажлын цаг (Рабочие часы) */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Ажлын цаг</h3>
                  <p className="text-xs text-muted-foreground">Захиалга хүлээн авах цаг</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Input
                    id="work_hours_start"
                    type="time"
                    {...register("work_hours_start")}
                    className="h-11 font-medium px-2 text-sm w-24 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:md:block"
                  />
                  <span className="text-muted-foreground font-medium">—</span>
                  <Input
                    id="work_hours_end"
                    type="time"
                    {...register("work_hours_end")}
                    className="h-11 font-medium px-2 text-sm w-24 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:md:block"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Захиалга хүлээн авах цаг
                </p>
              </div>
              {errors.work_hours_end && (
                <p className="text-xs text-destructive mt-2">{errors.work_hours_end.message}</p>
              )}
            </div>

            {/* Үнэ */}
            <div className="col-span-2 md:col-span-1 bg-card rounded-2xl border shadow-sm p-5 flex flex-col hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-lg">₮</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Үнэ</h3>
                  <p className="text-xs text-muted-foreground">Төгрөгөөр</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <div className="relative">
                  <Input
                    id="price"
                    type="text"
                    inputMode="numeric"
                    value={displayPrice}
                    onChange={handlePriceChange}
                    placeholder="50,000"
                    className="h-11 pr-10 text-center font-medium"
                    disabled={watchIsNegotiable}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ₮
                  </span>
                </div>
                <label className="flex items-center justify-center gap-2 cursor-pointer py-1.5 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <Checkbox
                    id="is_negotiable"
                    checked={watchIsNegotiable}
                    onCheckedChange={(checked) =>
                      setValue("is_negotiable", checked as boolean)
                    }
                  />
                  <span className="text-sm">Тохиролцоно</span>
                </label>
              </div>
              {errors.price && (
                <p className="text-xs text-destructive mt-2">{errors.price.message}</p>
              )}
            </div>
          </div>

          {/* Зураг */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-muted/30 px-5 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Зураг</h3>
                    <p className="text-xs text-muted-foreground">Эхний зураг нүүр зураг болно</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-full border">
                  <span className="text-sm font-medium">{images.length}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-sm text-muted-foreground">3</span>
                </div>
              </div>
            </div>
            <div className="p-5">
              <ImageUpload images={images} onChange={setImages} maxImages={3} />
              {images.length === 0 && (
                <div className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm">Зар нэмэхийн тулд дор хаяж 1 зураг оруулна уу</p>
                </div>
              )}
            </div>
          </div>

          {/* Кнопки */}
          <div className="bg-card rounded-2xl border shadow-sm p-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={isSubmitting || isSavingDraft}
                className="sm:w-auto order-3 sm:order-1"
              >
                <X className="mr-2 h-4 w-4" />
                Болих
              </Button>

              {/* Черновик хадгалах */}
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={isSubmitting || isSavingDraft}
                className="sm:w-auto order-2"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Хадгалж байна...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Черновик хадгалах
                  </>
                )}
              </Button>

              {/* Нийтлэх */}
              <Button
                type="submit"
                className="flex-1 h-12 text-base font-semibold shadow-lg shadow-primary/25 order-1 sm:order-3"
                disabled={isSubmitting || isSavingDraft || (images.length === 0 && !editingDraftId)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {editingDraftId ? "Нийтэлж байна..." : "Үүсгэж байна..."}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    {editingDraftId ? "Нийтлэх" : "Зар нэмэх"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Address Select Modal */}
      <AddressSelectModal
        open={showAddressModal}
        onOpenChange={setShowAddressModal}
        onSelect={setSelectedAddress}
        initialAddress={selectedAddress || undefined}
        hideKhoroo
      />

      {/* Category Select Modal */}
      <CategorySelectModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        onSelect={handleCategorySelect}
        categories={categories}
        initialCategory={selectedCategory || undefined}
      />
    </div>
  );
}
