"use client";

import * as React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Briefcase,
  Building2,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, ImageFile } from "@/components/image-upload";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthModal } from "@/components/auth-modal";
import { FavoritesButton } from "@/components/favorites-button";
import { RequestsButton } from "@/components/requests-button";
import { NotificationsButton } from "@/components/notifications-button";

// Types for modals
import type { AddressData } from "@/components/address-select-modal";
import type { CategoryData } from "@/components/category-select-modal";

// Lazy load modals - not loaded until opened (~30KB saved)
const AddressSelectModal = dynamic(
  () => import("@/components/address-select-modal").then((mod) => ({ default: mod.AddressSelectModal })),
  { ssr: false }
);
const CategorySelectModal = dynamic(
  () => import("@/components/category-select-modal").then((mod) => ({ default: mod.CategorySelectModal })),
  { ssr: false }
);
const LocationPickerMap = dynamic(
  () => import("@/components/location-picker-map").then((mod) => ({ default: mod.LocationPickerMap })),
  { ssr: false, loading: () => <div className="w-full h-15 bg-muted/50 rounded-xl animate-pulse" /> }
);

import { useCreatelistings, useFindManylistings, useUpdatelistings, useDeletelistings } from "@/lib/hooks/listings";
import { useCurrentUser } from "@/hooks/use-current-user";
import { uploadListingImage, deleteAllListingImages } from "@/lib/storage/listings";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { cn } from "@/lib/utils";
import { useBatchCreateImages } from "@/hooks/use-batch-create-images";
import { checkRateLimit, RATE_LIMITS } from "@/lib/utils/rate-limit";
import { listingSchema, listingFormDefaults, type ListingFormData } from "@/lib/schemas/listing";
import { toast } from "sonner";

// Category type from server
interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  children?: Category[];
}

interface CreateListingClientProps {
  categories: Category[];
}

/**
 * Client component for creating/editing listings
 * Categories are prefetched on server
 */
export function CreateListingClient({ categories }: CreateListingClientProps) {
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
  const [locationCoordinates, setLocationCoordinates] = useState<[number, number] | null>(null);

  // Auto-save ref for debounce
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");

  // Fetch user's draft listings
  // OPTIMIZATION: Добавлен staleTime - черновики не меняются часто извне
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
      take: 10, // OPTIMIZATION: Лимит на черновики
    } : undefined,
    {
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000, // 2 минуты - черновики редко меняются извне
      gcTime: 10 * 60 * 1000,   // 10 минут в кэше
    }
  );

  const createListing = useCreatelistings();
  const updateListing = useUpdatelistings();
  const deleteListing = useDeletelistings();
  const batchCreateImages = useBatchCreateImages();

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
    defaultValues: listingFormDefaults,
  });

  const watchServiceType = watch("service_type");

  // Price formatting with thousand separators
  const [displayPrice, setDisplayPrice] = useState("");

  const formatPriceDisplay = useCallback((value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    return Number(numericValue).toLocaleString("mn-MN");
  }, []);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setDisplayPrice(formatPriceDisplay(rawValue));
    setValue("price", rawValue);
  }, [formatPriceDisplay, setValue]);

  // Phone formatting: +976 XXXX-XXXX
  const [displayPhone, setDisplayPhone] = useState("");

  const formatPhoneDisplay = useCallback((value: string) => {
    // Убираем всё кроме цифр
    let digits = value.replace(/\D/g, "");

    // Если начинается с 976, убираем код страны
    if (digits.startsWith("976")) {
      digits = digits.slice(3);
    }

    // Ограничиваем до 8 цифр
    const limited = digits.slice(0, 8);

    // Пустое поле - возвращаем пустую строку
    if (limited.length === 0) {
      return "";
    }

    // Форматируем: +976 XXXX-XXXX
    if (limited.length <= 4) {
      return `+976 ${limited}`;
    }
    return `+976 ${limited.slice(0, 4)}-${limited.slice(4)}`;
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDisplay(e.target.value);
    setDisplayPhone(formatted);
    // Сохраняем только 8 цифр без кода страны
    const digits = e.target.value.replace(/\D/g, "");
    const rawValue = digits.startsWith("976") ? digits.slice(3).slice(0, 8) : digits.slice(0, 8);
    setValue("phone", rawValue);
  }, [formatPhoneDisplay, setValue]);

  // Show login modal if not authenticated
  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  const handleLoginSuccess = useCallback(() => {
    setShowLoginModal(false);
    window.location.reload();
  }, []);

  const handleLoginModalClose = useCallback((open: boolean) => {
    if (!open && !user) {
      router.push("/");
    } else {
      setShowLoginModal(open);
    }
  }, [router, user]);

  // Category selection handler
  const handleCategorySelect = useCallback((category: CategoryData) => {
    setSelectedCategory(category);
    setValue("category_id", category.id);
  }, [setValue]);

  // Format address for display
  const formatAddress = useCallback((address: AddressData | null) => {
    if (!address) return null;
    return [address.city, address.district, address.khoroo].join(", ");
  }, []);

  // Load draft for editing
  const loadDraft = useCallback((draft: NonNullable<typeof drafts>[0]) => {
    if (!draft) return;

    setEditingDraftId(draft.id);
    setShowDraftBanner(false);

    const priceValue = draft.price ? String(draft.price) : "";
    const phoneValue = draft.phone || "";
    reset({
      title: draft.title || "",
      description: draft.description || "",
      category_id: draft.category_id || "",
      price: priceValue,
      duration_minutes: draft.duration_minutes ? String(draft.duration_minutes) : "",
      service_type: (draft.service_type as "on_site" | "remote") || "on_site",
      phone: phoneValue,
      address_detail: draft.address || "",
      work_hours_start: draft.work_hours_start || "09:00",
      work_hours_end: draft.work_hours_end || "18:00",
    });
    setDisplayPrice(formatPriceDisplay(priceValue));
    setDisplayPhone(formatPhoneDisplay(phoneValue));

    if (draft.category) {
      const cat = draft.category as Category;
      setSelectedCategory({
        id: cat.id,
        name: cat.name,
        parentName: cat.parent_id ? categories.find(c => c.id === cat.parent_id)?.name : undefined,
      });
    }

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

    // Load coordinates if available
    if (draft.latitude && draft.longitude) {
      setLocationCoordinates([Number(draft.latitude), Number(draft.longitude)]);
    } else {
      setLocationCoordinates(null);
    }
  }, [categories, formatPriceDisplay, formatPhoneDisplay, reset]);

  // Delete draft
  const handleDeleteDraft = useCallback(async (draftId: string) => {
    try {
      setDeletingDraftId(draftId);

      const draftToDelete = drafts?.find(d => d.id === draftId);
      if (draftToDelete?.images && user?.id) {
        await deleteAllListingImages(user.id, draftId);
      }

      await deleteListing.mutateAsync({ where: { id: draftId } });
      refetchDrafts();

      if (editingDraftId === draftId) {
        setEditingDraftId(null);
        reset(listingFormDefaults);
        setSelectedCategory(null);
        setSelectedAddress(null);
        setImages([]);
        setDisplayPrice("");
      }
    } catch {
      // Draft deletion failed silently - drafts will be cleaned up later
    } finally {
      setDeletingDraftId(null);
    }
  }, [drafts, user?.id, deleteListing, refetchDrafts, editingDraftId, reset]);

  // Auto-save draft with debounce
  const autoSaveDraft = useCallback(async () => {
    if (!user?.id || !editingDraftId) return;

    const data = getValues();
    const dataString = JSON.stringify(data);

    // Don't save if data hasn't changed
    if (dataString === lastSavedDataRef.current) return;

    // Rate limit check
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.draftSave);
    if (!rateLimitResult.allowed) return;

    try {
      const slug = generateUniqueSlug(data.title || "draft");
      const addressStr = formatAddress(selectedAddress);

      await updateListing.mutateAsync({
        where: { id: editingDraftId },
        data: {
          title: data.title || "Ноорог",
          slug,
          description: data.description || "",
          ...(data.category_id && { category_id: data.category_id }),
          // remote = "Миний газар" (клиент приходит к исполнителю) - сохраняем адрес исполнителя
          address: data.service_type === "remote" ? data.address_detail : addressStr,
          aimag_id: selectedAddress?.cityId || null,
          district_id: selectedAddress?.districtId || null,
          khoroo_id: selectedAddress?.khorooId || null,
          price: data.price ? parseFloat(data.price) : null,
          is_negotiable: false,
          duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
          service_type: data.service_type,
          phone: data.phone || null,
          latitude: data.service_type === "remote" ? locationCoordinates?.[0] : null,
          longitude: data.service_type === "remote" ? locationCoordinates?.[1] : null,
          work_hours_start: data.work_hours_start || "09:00",
          work_hours_end: data.work_hours_end || "18:00",
        },
      });

      lastSavedDataRef.current = dataString;
      // Show subtle toast for auto-save success
      toast.success("Автоматаар хадгалагдлаа", {
        duration: 2000,
        id: "auto-save", // Prevent duplicate toasts
      });
    } catch {
      // Auto-save failed silently - will retry on next change
    }
  }, [user?.id, editingDraftId, getValues, formatAddress, selectedAddress, locationCoordinates, updateListing]);

  // Watch form changes for auto-save
  useEffect(() => {
    if (!editingDraftId) return;

    const subscription = watch(() => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(autoSaveDraft, 3000); // 3 second debounce
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editingDraftId, watch, autoSaveDraft]);

  // Save as draft
  const saveDraft = useCallback(async () => {
    if (!user?.id) return;

    const data = getValues();

    if (!data.title || data.title.length < 3) {
      toast.error("Гарчиг хамгийн багадаа 3 тэмдэгт байх ёстой");
      return;
    }

    // Rate limit check
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.draftSave);
    if (!rateLimitResult.allowed) {
      const resetInSeconds = Math.ceil(rateLimitResult.resetIn / 1000);
      toast.error(`Хэт олон хүсэлт. ${resetInSeconds} секунд хүлээнэ үү.`);
      return;
    }

    try {
      setIsSavingDraft(true);

      const slug = generateUniqueSlug(data.title);
      const addressStr = formatAddress(selectedAddress);

      if (editingDraftId) {
        await updateListing.mutateAsync({
          where: { id: editingDraftId },
          data: {
            title: data.title,
            slug,
            description: data.description || "",
            ...(data.category_id && { category_id: data.category_id }),
            // remote = "Миний газар" (клиент приходит к исполнителю) - сохраняем адрес исполнителя
            address: data.service_type === "remote" ? data.address_detail : addressStr,
            aimag_id: selectedAddress?.cityId || null,
            district_id: selectedAddress?.districtId || null,
            khoroo_id: selectedAddress?.khorooId || null,
            price: data.price ? parseFloat(data.price) : null,
            is_negotiable: false,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            service_type: data.service_type,
            phone: data.phone || null,
            latitude: data.service_type === "remote" ? locationCoordinates?.[0] : null,
            longitude: data.service_type === "remote" ? locationCoordinates?.[1] : null,
            work_hours_start: data.work_hours_start || "09:00",
            work_hours_end: data.work_hours_end || "18:00",
          },
        });

        if (images.length > 0) {
          const uploadResults = await Promise.all(
            images.map(async (image, i) => {
              const uuid = crypto.randomUUID();
              const { url, error } = await uploadListingImage(user.id, editingDraftId, image.file, uuid);
              if (error || !url) return null;
              return { url, sort_order: i, is_cover: i === 0 };
            })
          );

          const validImages = uploadResults.filter((r): r is { url: string; sort_order: number; is_cover: boolean } => r !== null);
          if (validImages.length > 0) {
            await batchCreateImages.mutateAsync({
              listing_id: editingDraftId,
              images: validImages,
            });
          }
        }
      } else {
        const listing = await createListing.mutateAsync({
          data: {
            title: data.title,
            slug,
            description: data.description || "",
            ...(data.category_id && { category_id: data.category_id }),
            user_id: user.id,
            // remote = "Миний газар" (клиент приходит к исполнителю) - сохраняем адрес исполнителя
            address: data.service_type === "remote" ? data.address_detail : addressStr,
            aimag_id: selectedAddress?.cityId || null,
            district_id: selectedAddress?.districtId || null,
            khoroo_id: selectedAddress?.khorooId || null,
            price: data.price ? parseFloat(data.price) : null,
            is_negotiable: false,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            service_type: data.service_type,
            phone: data.phone || null,
            latitude: data.service_type === "remote" ? locationCoordinates?.[0] : null,
            longitude: data.service_type === "remote" ? locationCoordinates?.[1] : null,
            work_hours_start: data.work_hours_start || "09:00",
            work_hours_end: data.work_hours_end || "18:00",
            status: "draft",
            is_active: false,
          },
        });

        if (listing && images.length > 0) {
          const uploadResults = await Promise.all(
            images.map(async (image, i) => {
              const uuid = crypto.randomUUID();
              const { url, error } = await uploadListingImage(user.id, listing.id, image.file, uuid);
              if (error || !url) return null;
              return { url, sort_order: i, is_cover: i === 0 };
            })
          );

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

      setImages([]);
      refetchDrafts();
      toast.success("Ноорог хадгалагдлаа!");
    } catch {
      toast.error("Ноорог хадгалахад алдаа гарлаа");
    } finally {
      setIsSavingDraft(false);
    }
  }, [user?.id, getValues, formatAddress, selectedAddress, editingDraftId, updateListing, createListing, images, batchCreateImages, refetchDrafts]);

  const onSubmit = useCallback(async (data: ListingFormData) => {
    if (!user?.id) {
      toast.error("Нэвтрэх шаардлагатай");
      return;
    }

    // Rate limit check
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.listingCreate);
    if (!rateLimitResult.allowed) {
      const resetInSeconds = Math.ceil(rateLimitResult.resetIn / 1000);
      toast.error(`Хэт олон зар үүсгэсэн байна. ${resetInSeconds} секунд хүлээнэ үү.`);
      return;
    }

    try {
      setIsSubmitting(true);

      const slug = generateUniqueSlug(data.title);
      const addressStr = formatAddress(selectedAddress);

      let listingId: string;
      let listingSlug: string;

      if (editingDraftId) {
        const updated = await updateListing.mutateAsync({
          where: { id: editingDraftId },
          data: {
            title: data.title,
            slug,
            description: data.description,
            category_id: data.category_id,
            // remote = "Миний газар" (клиент приходит к исполнителю) - сохраняем адрес исполнителя, для "Зочны газар" - адрес из модалки
            address: data.service_type === "remote" ? data.address_detail : addressStr,
            aimag_id: selectedAddress?.cityId || null,
            district_id: selectedAddress?.districtId || null,
            khoroo_id: selectedAddress?.khorooId || null,
            price: data.price ? parseFloat(data.price) : null,
            is_negotiable: false,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            service_type: data.service_type,
            phone: data.phone || null,
            latitude: data.service_type === "remote" ? locationCoordinates?.[0] : null,
            longitude: data.service_type === "remote" ? locationCoordinates?.[1] : null,
            work_hours_start: data.work_hours_start || "09:00",
            work_hours_end: data.work_hours_end || "18:00",
            status: "active",
            is_active: true,
            published_at: new Date(),
          },
        });

        listingId = editingDraftId;
        listingSlug = updated?.slug || slug;

        if (images.length > 0) {
          const existingImages = drafts?.find(d => d.id === editingDraftId)?.images?.length || 0;

          const uploadResults = await Promise.all(
            images.map(async (image, i) => {
              const uuid = crypto.randomUUID();
              const { url, error } = await uploadListingImage(user.id, listingId, image.file, uuid);
              if (error || !url) return null;
              return { url, sort_order: existingImages + i, is_cover: existingImages === 0 && i === 0 };
            })
          );

          const validImages = uploadResults.filter((r): r is { url: string; sort_order: number; is_cover: boolean } => r !== null);
          if (validImages.length > 0) {
            await batchCreateImages.mutateAsync({
              listing_id: listingId,
              images: validImages,
            });
          }
        }
      } else {
        const listing = await createListing.mutateAsync({
          data: {
            title: data.title,
            slug,
            description: data.description,
            category_id: data.category_id,
            user_id: user.id,
            // remote = "Миний газар" (клиент приходит к исполнителю) - сохраняем адрес исполнителя, для "Зочны газар" - адрес из модалки
            address: data.service_type === "remote" ? data.address_detail : addressStr,
            aimag_id: selectedAddress?.cityId || null,
            district_id: selectedAddress?.districtId || null,
            khoroo_id: selectedAddress?.khorooId || null,
            price: data.price ? parseFloat(data.price) : null,
            is_negotiable: false,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            service_type: data.service_type,
            phone: data.phone || null,
            latitude: data.service_type === "remote" ? locationCoordinates?.[0] : null,
            longitude: data.service_type === "remote" ? locationCoordinates?.[1] : null,
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

        if (images.length > 0) {
          const uploadResults = await Promise.all(
            images.map(async (image, i) => {
              const uuid = crypto.randomUUID();
              const { url, error } = await uploadListingImage(user.id, listingId, image.file, uuid);
              if (error || !url) return null;
              return { url, sort_order: i, is_cover: i === 0 };
            })
          );

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
    } catch {
      toast.error("Зар үүсгэхэд алдаа гарлаа");
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, formatAddress, selectedAddress, editingDraftId, updateListing, createListing, images, drafts, batchCreateImages, router]);

  const resetForm = useCallback(() => {
    setEditingDraftId(null);
    reset(listingFormDefaults);
    setSelectedCategory(null);
    setSelectedAddress(null);
    setImages([]);
    setDisplayPrice("");
    setLocationCoordinates(null);
    setShowDraftBanner(true);
  }, [reset]);

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
          {/* Mobile Nav - notifications bell */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationsButton />
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <NotificationsButton />
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
              {editingDraftId ? "Ноорог засах" : "Шинэ зар"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {editingDraftId ? "Ноорогоо засаад нийтлэнэ үү" : "Үйлчилгээний мэдээллээ оруулна уу"}
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
                    Танд {drafts.length} ноорог байна
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
                      + {drafts.length - 3} бусад ноорог
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
                    Ноорог засаж байна (автоматаар хадгалагдана)
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                  onClick={resetForm}
                >
                  Шинэ зар үүсгэх
                </Button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-5">
          {/* Үндсэн мэдээлэл */}
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
              {/* Title */}
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

              {/* Description */}
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

          {/* Ангилал, Байршил, Үнэ, Утас - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
            {/* Category */}
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

            {/* Location */}
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

            {/* Price */}
            <div className="col-span-1 md:col-span-1 bg-card rounded-2xl border shadow-sm p-5 flex flex-col hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-lg">₮</span>
                </div>
                <div className="min-h-10 flex flex-col justify-center">
                  <h3 className="font-semibold text-sm leading-tight">Үнэ <span className="text-destructive">*</span></h3>
                  <p className="text-xs text-muted-foreground leading-tight">Төгрөгөөр</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <div className="relative">
                  <Input
                    id="price"
                    type="text"
                    inputMode="numeric"
                    value={displayPrice}
                    onChange={handlePriceChange}
                    placeholder="50,000"
                    className="h-11 pr-10 text-center font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ₮
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center py-1.5 h-8 flex items-center justify-center">
                  Үнийн санал
                </p>
              </div>
              {errors.price && (
                <p className="text-xs text-destructive mt-2">{errors.price.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-col hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-h-10 flex flex-col justify-center">
                  <h3 className="font-semibold text-sm leading-tight">Утас</h3>
                  <p className="text-xs text-muted-foreground leading-tight">Холбоо барих</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <Input
                  type="tel"
                  value={displayPhone}
                  onChange={handlePhoneChange}
                  placeholder="+976 9911-2233"
                  className="h-11 text-center font-medium"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground text-center py-1.5 h-8 flex items-center justify-center">
                  Захиалагч холбогдоно
                </p>
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive mt-2">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Service Type */}
          <div className="bg-card rounded-2xl border shadow-sm p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Үйлчилгээний төрөл</h3>
                <p className="text-xs text-muted-foreground">Зочны газар эсвэл таны газар</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all",
                watchServiceType === "on_site"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              )}>
                <input
                  type="radio"
                  value="on_site"
                  {...register("service_type")}
                  className="sr-only"
                />
                <MapPin className={cn(
                  "h-6 w-6",
                  watchServiceType === "on_site" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium text-center",
                  watchServiceType === "on_site" ? "text-primary" : "text-muted-foreground"
                )}>Зочны газар</span>
                <span className="text-xs text-muted-foreground text-center">Үйлчлүүлэгч дээр очно</span>
              </label>
              <label className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all",
                watchServiceType === "remote"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              )}>
                <input
                  type="radio"
                  value="remote"
                  {...register("service_type")}
                  className="sr-only"
                />
                <Building2 className={cn(
                  "h-6 w-6",
                  watchServiceType === "remote" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium text-center",
                  watchServiceType === "remote" ? "text-primary" : "text-muted-foreground"
                )}>Миний газар</span>
                <span className="text-xs text-muted-foreground text-center">Үйлчлүүлэгч ирнэ</span>
              </label>
            </div>

            {/* Detailed address and map - only shown when "Миний газар" (remote) is selected */}
            {/* remote = клиент приходит к исполнителю, поэтому нужен адрес исполнителя */}
            {watchServiceType === "remote" && (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address_detail" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    Дэлгэрэнгүй хаяг
                  </Label>
                  <Input
                    id="address_detail"
                    {...register("address_detail")}
                    placeholder="Жишээ: 15-р байр, 3-р орц, 45 тоот"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Үйлчлүүлэгч таны газар ирэхэд шаардлагатай хаягийн мэдээлэл
                  </p>
                </div>

                {/* Location picker map */}
                <LocationPickerMap
                  coordinates={locationCoordinates}
                  onCoordinatesChange={(coords, address) => {
                    setLocationCoordinates(coords);
                    if (coords) {
                      setValue("latitude", coords[0]);
                      setValue("longitude", coords[1]);
                      // Auto-fill address field with reverse geocoded address
                      if (address) {
                        setValue("address_detail", address);
                      }
                    } else {
                      setValue("latitude", null);
                      setValue("longitude", null);
                      setValue("address_detail", "");
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Images */}
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

          {/* Buttons */}
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
                    Ноорог хадгалах
                  </>
                )}
              </Button>

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
