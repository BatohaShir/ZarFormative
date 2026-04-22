"use client";

import * as React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Tag,
  MapPin,
  Plus,
  Save,
  X,
  Edit3,
  Trash2,
  AlertCircle,
  Building2,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload, ImageFile } from "@/components/image-upload";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { SiteHeader } from "@/components/site-header";

// Types for modals
import type { AddressData } from "@/components/address-select-modal";
import type { CategoryData } from "@/components/category-select-modal";

// Lazy load modals - not loaded until opened (~30KB saved)
const AddressSelectModal = dynamic(
  () =>
    import("@/components/address-select-modal").then((mod) => ({
      default: mod.AddressSelectModal,
    })),
  { ssr: false }
);
const CategorySelectModal = dynamic(
  () =>
    import("@/components/category-select-modal").then((mod) => ({
      default: mod.CategorySelectModal,
    })),
  { ssr: false }
);
const LocationPickerMap = dynamic(
  () =>
    import("@/components/location-picker-map").then((mod) => ({ default: mod.LocationPickerMap })),
  {
    ssr: false,
    loading: () => <div className="w-full h-15 bg-muted/50 rounded-xl animate-pulse" />,
  }
);

import {
  useCreatelistings,
  useFindManylistings,
  useUpdatelistings,
  useDeletelistings,
} from "@/lib/hooks/listings";
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
  /**
   * User's draft listings pre-fetched on SSR in the same round-trip
   * as categories. Feeds React Query's initialData so the drafts
   * banner renders on first paint without a client-side findMany.
   *
   * Shape is intentionally `unknown[]` at the boundary: the ZenStack
   * hook's type is wider than what the SSR CTE produces (no timestamps
   * hydrated back into Date objects, etc.) and the client code only
   * reads a handful of fields, so structural compatibility is enough.
   */
  initialDrafts?: unknown[];
}

/**
 * Client component for creating/editing listings
 * Categories are prefetched on server
 */
export function CreateListingClient({ categories, initialDrafts }: CreateListingClientProps) {
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

  // Pre-generated listing UUID used as the upload folder. We commit to
  // an id the moment the user adds a photo so background uploads can
  // start immediately; at submit time we pass this same id to Prisma
  // instead of letting the DB generate one. Uploaded files that never
  // reach a saved row are swept by the cleanup-orphaned-files cron.
  const prewarmListingIdRef = useRef<string | null>(null);
  const getPrewarmListingId = useCallback(() => {
    if (!prewarmListingIdRef.current) {
      prewarmListingIdRef.current = crypto.randomUUID();
    }
    return prewarmListingIdRef.current;
  }, []);

  // Background upload for a single processed file. Returns a promise
  // that ImageUpload stores on the ImageFile; onSubmit awaits them.
  const handleBackgroundUpload = useCallback(
    async (file: File) => {
      if (!user?.id) {
        return { url: null, error: "Нэвтрэх шаардлагатай" };
      }
      // Editing a draft? Re-use the draft's own id so the upload
      // lands in its folder. Otherwise use the prewarm id that will
      // become the new listing's id on submit.
      const listingId = editingDraftId ?? getPrewarmListingId();
      const uuid = crypto.randomUUID();
      return uploadListingImage(user.id, listingId, file, uuid);
    },
    [user?.id, editingDraftId, getPrewarmListingId]
  );

  // Auto-save ref for debounce
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");

  // Fetch user's draft listings. Seeded from SSR via initialDrafts so
  // first paint has the list ready and the mount-time findMany is a
  // no-op (staleTime keeps it fresh for 5 min).
  //
  // The ZenStack hook types `data` via a conditional that collapses to
  // `{}` once we widen its initialData. The UI here reads many fields
  // (loadDraft uses the full row shape) so we re-cast to the full
  // Prisma type at the boundary via `unknown`. SSR payload has ISO
  // strings instead of Date where the type says Date — downstream code
  // tolerates that (only uses `new Date(updated_at).toLocaleDateString`
  // and the form fill sets strings anyway).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DraftRow = any;
  const { data: draftsRaw, refetch: refetchDrafts } = useFindManylistings(
    user?.id
      ? {
          where: { user_id: user.id, status: "draft" },
          include: { category: true, images: true },
          orderBy: { updated_at: "desc" },
          take: 10,
        }
      : undefined,
    {
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      initialData: initialDrafts as never,
    }
  );
  const drafts = draftsRaw as unknown as DraftRow[] | undefined;

  const createListing = useCreatelistings();
  const updateListing = useUpdatelistings();
  const deleteListing = useDeletelistings();
  const batchCreateImages = useBatchCreateImages();

  /**
   * Shared helper to resolve image uploads + write the metadata rows.
   *
   * Images added via the ImageUpload component start uploading in
   * the background the moment the user picks them, so by the time
   * onSubmit / saveDraft runs we're almost always just awaiting an
   * already-resolved promise. Pre-existing images loaded from a draft
   * have no uploadPromise so we upload them at submit time as fallback.
   *
   * Returns the count of successfully linked images.
   */
  const resolveAndLinkImages = useCallback(
    async (
      listingId: string,
      imagesToLink: ImageFile[],
      existingImagesCount: number = 0
    ): Promise<number> => {
      if (!user?.id || imagesToLink.length === 0) return 0;

      const uploadedResults = await Promise.all(
        imagesToLink.map(async (image) => {
          if (image.uploadPromise) return image.uploadPromise;
          const uuid = crypto.randomUUID();
          return uploadListingImage(user.id, listingId, image.file, uuid);
        })
      );

      const validImages = uploadedResults
        .map((res, i) => ({ res, i }))
        .filter(({ res }) => Boolean(res.url))
        .map(({ res, i }) => ({
          url: res.url as string,
          sort_order: existingImagesCount + i,
          is_cover: existingImagesCount === 0 && i === 0,
        }));

      if (validImages.length > 0) {
        await batchCreateImages.mutateAsync({
          listing_id: listingId,
          images: validImages,
        });
      }

      return validImages.length;
    },
    [user?.id, batchCreateImages]
  );

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
  const watchIsNegotiable = watch("is_negotiable");

  // Price formatting with thousand separators
  const [displayPrice, setDisplayPrice] = useState("");

  const formatPriceDisplay = useCallback((value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    return Number(numericValue).toLocaleString("mn-MN");
  }, []);

  const handlePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "");
      setDisplayPrice(formatPriceDisplay(rawValue));
      setValue("price", rawValue);
    },
    [formatPriceDisplay, setValue]
  );

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

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneDisplay(e.target.value);
      setDisplayPhone(formatted);
      // Сохраняем только 8 цифр без кода страны
      const digits = e.target.value.replace(/\D/g, "");
      const rawValue = digits.startsWith("976") ? digits.slice(3).slice(0, 8) : digits.slice(0, 8);
      setValue("phone", rawValue);
    },
    [formatPhoneDisplay, setValue]
  );

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

  const handleLoginModalClose = useCallback(
    (open: boolean) => {
      if (!open && !user) {
        router.push("/");
      } else {
        setShowLoginModal(open);
      }
    },
    [router, user]
  );

  // Category selection handler
  const handleCategorySelect = useCallback(
    (category: CategoryData) => {
      setSelectedCategory(category);
      setValue("category_id", category.id);
    },
    [setValue]
  );

  // Format address for display
  const formatAddress = useCallback((address: AddressData | null) => {
    if (!address) return null;
    return [address.city, address.district, address.khoroo].join(", ");
  }, []);

  // Load draft for editing
  const loadDraft = useCallback(
    (draft: NonNullable<typeof drafts>[0]) => {
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
        is_negotiable: draft.is_negotiable || false,
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
          parentName: cat.parent_id
            ? categories.find((c) => c.id === cat.parent_id)?.name
            : undefined,
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
    },
    [categories, formatPriceDisplay, formatPhoneDisplay, reset]
  );

  // Delete draft
  const handleDeleteDraft = useCallback(
    async (draftId: string) => {
      try {
        setDeletingDraftId(draftId);

        const draftToDelete = drafts?.find((d) => d.id === draftId);
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
        toast.error("Ноорог устгахад алдаа гарлаа");
      } finally {
        setDeletingDraftId(null);
      }
    },
    [drafts, user?.id, deleteListing, refetchDrafts, editingDraftId, reset]
  );

  // Auto-save draft: diff-only update fires 6s after the user stops
  // changing the form. Previously the debounce was 3s and the payload
  // was the full form every time, so fast typists could sustain a
  // 2s-round-trip-per-keystroke pipeline. Now we send only the fields
  // that actually changed since the last successful save.
  const autoSaveDraft = useCallback(async () => {
    if (!user?.id || !editingDraftId) return;

    const data = getValues();
    const dataString = JSON.stringify(data);

    // Bail fast when nothing has moved since the last save.
    if (dataString === lastSavedDataRef.current) return;

    // Rate limit check
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.draftSave);
    if (!rateLimitResult.allowed) return;

    try {
      // Rebuild the saved snapshot for diffing; if we have no previous
      // snapshot this is the first autosave after load, send the full row.
      const prev = lastSavedDataRef.current
        ? (JSON.parse(lastSavedDataRef.current) as Partial<ListingFormData>)
        : null;

      const addressStr = formatAddress(selectedAddress);
      const fullPatch: Record<string, unknown> = {
        title: data.title || "Ноорог",
        description: data.description || "",
        address: data.service_type === "remote" ? data.address_detail : addressStr,
        aimag_id: selectedAddress?.cityId || null,
        district_id: selectedAddress?.districtId || null,
        khoroo_id: selectedAddress?.khorooId || null,
        price: data.price ? parseFloat(data.price) : null,
        is_negotiable: data.is_negotiable || false,
        duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
        service_type: data.service_type,
        phone: data.phone || null,
        latitude: data.service_type === "remote" ? locationCoordinates?.[0] : null,
        longitude: data.service_type === "remote" ? locationCoordinates?.[1] : null,
        work_hours_start: data.work_hours_start || "09:00",
        work_hours_end: data.work_hours_end || "18:00",
      };
      if (data.category_id) fullPatch.category_id = data.category_id;

      // Only include title/slug in the patch when the title actually
      // changed — regenerateUniqueSlug is CPU-heavy (transliteration)
      // and rotating the slug invalidates any outstanding prefetch of
      // the detail page.
      const titleChanged = !prev || prev.title !== data.title;
      if (titleChanged) {
        fullPatch.slug = generateUniqueSlug(data.title || "draft");
      }

      // Diff: keep only keys whose JSON representation differs from the
      // previous snapshot. First autosave sends everything.
      let patch: Record<string, unknown>;
      if (prev) {
        patch = {};
        for (const [key, value] of Object.entries(fullPatch)) {
          const prevValue = (prev as Record<string, unknown>)[key];
          if (JSON.stringify(prevValue) !== JSON.stringify(value)) {
            patch[key] = value;
          }
        }
        if (Object.keys(patch).length === 0) {
          lastSavedDataRef.current = dataString;
          return;
        }
      } else {
        patch = fullPatch;
      }

      await updateListing.mutateAsync({
        where: { id: editingDraftId },
        data: patch,
      });

      lastSavedDataRef.current = dataString;
      toast.success("Автоматаар хадгалагдлаа", {
        duration: 2000,
        id: "auto-save",
      });
    } catch {
      toast.error("Автоматаар хадгалахад алдаа гарлаа", {
        duration: 3000,
        id: "auto-save-error",
      });
    }
  }, [
    user?.id,
    editingDraftId,
    getValues,
    formatAddress,
    selectedAddress,
    locationCoordinates,
    updateListing,
  ]);

  // Stable ref so the beforeunload handler always calls the latest
  // closure without re-attaching the listener on every render.
  const autoSaveDraftRef = useRef(autoSaveDraft);
  useEffect(() => {
    autoSaveDraftRef.current = autoSaveDraft;
  }, [autoSaveDraft]);

  // Watch form changes for auto-save.
  // Debounce raised from 3s to 6s: text fields trigger watch() on every
  // keystroke, so a shorter window lets fast typists sustain one DB
  // round-trip per word. 6s covers natural pauses without losing data.
  // We also flush on beforeunload below so nothing is lost on close.
  useEffect(() => {
    if (!editingDraftId) return;

    const subscription = watch(() => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(autoSaveDraft, 6000);
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editingDraftId, watch, autoSaveDraft]);

  // Flush pending autosave when the user navigates away / closes the tab.
  // keepalive-style sendBeacon would be ideal, but ZenStack's REST path
  // needs auth cookies the browser sends automatically with fetch —
  // firing the save synchronously on beforeunload is good enough for
  // our rate of abandonment (text-only, no attachments at this point).
  useEffect(() => {
    if (!editingDraftId) return;
    const handler = () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      // Don't await — browser is about to tear us down.
      autoSaveDraftRef.current();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editingDraftId]);

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
            is_negotiable: data.is_negotiable || false,
            duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
            service_type: data.service_type,
            phone: data.phone || null,
            latitude: data.service_type === "remote" ? locationCoordinates?.[0] : null,
            longitude: data.service_type === "remote" ? locationCoordinates?.[1] : null,
            work_hours_start: data.work_hours_start || "09:00",
            work_hours_end: data.work_hours_end || "18:00",
          },
        });

        // Reuse background-uploaded URLs via the shared helper. For
        // pre-existing draft images without an uploadPromise the
        // helper falls back to uploading now.
        await resolveAndLinkImages(editingDraftId, images);
      } else {
        // Use the pre-warmed id so any photos the user already picked
        // have been uploading to listings/{user}/{newId}/* in the
        // background while the draft was being written.
        const newListingId = getPrewarmListingId();
        const listing = await createListing.mutateAsync({
          data: {
            id: newListingId,
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
            is_negotiable: data.is_negotiable || false,
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

        if (listing) {
          await resolveAndLinkImages(listing.id, images);
          setEditingDraftId(listing.id);
        }
      }

      setImages([]);
      refetchDrafts();
      toast.success("Ноорог хадгалагдлаа!");
    } catch {
      toast.error("Ноорог хадгалахад алдаа гарлаа");
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    user?.id,
    getValues,
    formatAddress,
    selectedAddress,
    editingDraftId,
    updateListing,
    createListing,
    images,
    locationCoordinates,
    resolveAndLinkImages,
    getPrewarmListingId,
    refetchDrafts,
  ]);

  const onSubmit = useCallback(
    async (data: ListingFormData) => {
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

        // Uploads that started when the user picked photos may already
        // be done; resolveAndLinkImages awaits whatever's still in flight.
        // We don't need to serialise against the listing mutation — both
        // can run in parallel because uploads land under the pre-warmed
        // listing id (or editingDraftId) regardless.

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
              is_negotiable: data.is_negotiable || false,
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

          // Same prefetch trick for the edit→publish path.
          router.prefetch(`/services/${listingSlug}`);

          const existingImages = drafts?.find((d) => d.id === editingDraftId)?.images?.length || 0;
          await resolveAndLinkImages(listingId, images, existingImages);
        } else {
          // Use the pre-warmed id so uploads already live under the
          // right folder path. Without this we'd either have to copy
          // files to the real listing folder or orphan them.
          const newListingId = getPrewarmListingId();
          const listing = await createListing.mutateAsync({
            data: {
              id: newListingId,
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
              is_negotiable: data.is_negotiable || false,
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

          // The listing row now exists — start the detail-page SSR
          // payload landing on the wire in parallel with the image-
          // metadata INSERT below. By the time router.push fires the
          // RSC chunk is often already in the Next.js cache.
          router.prefetch(`/services/${listingSlug}`);

          const linked = await resolveAndLinkImages(listingId, images);
          if (linked === 0 && images.length > 0) {
            throw new Error("Зураг оруулахад алдаа гарлаа! Storage-д хандах эрх шалгана уу.");
          }
        }

        router.push(`/services/${listingSlug}`);
      } catch {
        toast.error("Зар үүсгэхэд алдаа гарлаа");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      user?.id,
      formatAddress,
      selectedAddress,
      editingDraftId,
      updateListing,
      createListing,
      images,
      drafts,
      router,
      getPrewarmListingId,
      locationCoordinates,
      resolveAndLinkImages,
    ]
  );

  const resetForm = useCallback(() => {
    setEditingDraftId(null);
    reset(listingFormDefaults);
    setSelectedCategory(null);
    setSelectedAddress(null);
    setImages([]);
    setDisplayPrice("");
    setLocationCoordinates(null);
    setShowDraftBanner(true);
    // Drop the pre-warmed listing id so the next creation gets a
    // fresh folder and old uploads become orphans for the cleanup cron.
    prewarmListingIdRef.current = null;
  }, [reset]);

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center mx-auto mb-6">
              <Plus className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Нэвтэрнэ үү</h2>
            <p className="text-muted-foreground text-sm">Зар нэмэхийн тулд нэвтрэх шаардлагатай</p>
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
      <SiteHeader backHref="/" />

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Editorial page title */}
        <div className="mb-6 md:mb-10 max-w-5xl mx-auto">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            {editingDraftId ? "Ноорог засах" : "Шинэ зар"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {editingDraftId ? "Ноорогоо засаад нийтлэнэ үү" : "Үйлчилгээний мэдээллээ оруулна уу"}
          </p>
        </div>

        {/* Draft Banner */}
        {showDraftBanner && drafts && drafts.length > 0 && !editingDraftId && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="rounded-2xl ring-1 ring-border bg-muted/40 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-display font-semibold text-base">
                    Танд {drafts.length} ноорог байна
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Өмнө хадгалсан зараа үргэлжлүүлэх үү?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDraftBanner(false)}
                  aria-label="Хаах"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {drafts.slice(0, 3).map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between gap-2 bg-card rounded-xl p-3 ring-1 ring-border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{draft.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {draft.category?.name || "Ангилалгүй"} ·{" "}
                        {new Date(draft.updated_at).toLocaleDateString("mn-MN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadDraft(draft)}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-medium bg-foreground text-background hover:bg-foreground/90 active:scale-95 transition-all"
                      >
                        <Edit3 className="h-3 w-3" />
                        Үргэлжлүүлэх
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(draft.id)}
                        disabled={deletingDraftId === draft.id}
                        aria-label="Устгах"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {deletingDraftId === draft.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {drafts.length > 3 && (
                <p className="text-xs text-muted-foreground mt-3">
                  + {drafts.length - 3} бусад ноорог
                </p>
              )}
            </div>
          </div>
        )}

        {/* Editing draft indicator */}
        {editingDraftId && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="flex items-center justify-between gap-3 rounded-full ring-1 ring-border bg-muted/40 pl-4 pr-1.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">
                  Ноорог засаж байна{" "}
                  <span className="text-muted-foreground">· автоматаар хадгалагдана</span>
                </span>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center h-8 px-3 rounded-full text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors shrink-0"
              >
                Шинэ зар үүсгэх
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-5xl mx-auto space-y-6 md:space-y-8"
        >
          {/* Үндсэн мэдээлэл */}
          <section>
            <div className="mb-4">
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                Үндсэн мэдээлэл
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Зарын гарчиг болон тайлбар</p>
            </div>

            <div className="bg-card rounded-2xl ring-1 ring-border p-5 space-y-5">
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
          </section>

          {/* Ангилал, Байршил, Үнэ, Утас — monochrome cards */}
          <section>
            <div className="mb-4">
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                Үндсэн үзүүлэлт
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Ангилал, байршил, үнэ, утас</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 items-stretch">
              {/* Category */}
              <div className="bg-card rounded-2xl ring-1 ring-border p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Tag className="h-4.5 w-4.5 text-foreground" />
                  </div>
                  <div className="min-h-10 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm leading-tight">
                      Ангилал <span className="text-destructive">*</span>
                    </h3>
                    <p className="text-xs text-muted-foreground leading-tight">Төрөл сонгох</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 justify-start text-left font-normal overflow-hidden"
                    onClick={() => setShowCategoryModal(true)}
                  >
                    {selectedCategory ? (
                      <span className="truncate font-medium">{selectedCategory.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Сонгоно уу…</span>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center h-5 flex items-center justify-center">
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
              <div className="bg-card rounded-2xl ring-1 ring-border p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <MapPin className="h-4.5 w-4.5 text-foreground" />
                  </div>
                  <div className="min-h-10 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm leading-tight">Байршил</h3>
                    <p className="text-xs text-muted-foreground leading-tight">Хаана байрлах</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 justify-start text-left font-normal"
                    onClick={() => setShowAddressModal(true)}
                  >
                    {selectedAddress ? (
                      <span className="truncate font-medium">{selectedAddress.district}</span>
                    ) : (
                      <span className="text-muted-foreground">Сонгоно уу…</span>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center h-5 flex items-center justify-center">
                    Үйлчилгээний газар
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-card rounded-2xl ring-1 ring-border p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <span className="text-foreground font-bold text-base">₮</span>
                  </div>
                  <div className="min-h-10 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm leading-tight">
                      Үнэ {!watchIsNegotiable && <span className="text-destructive">*</span>}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-tight">Төгрөгөөр</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end gap-1.5">
                  {watchIsNegotiable ? (
                    <div className="h-11 flex items-center justify-center bg-muted rounded-lg border border-dashed border-border">
                      <span className="text-sm text-muted-foreground">Тохиролцоно</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        id="price"
                        type="text"
                        inputMode="numeric"
                        value={displayPrice}
                        onChange={handlePriceChange}
                        placeholder="50,000"
                        className="h-11 pr-10 text-center font-medium tabular"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        ₮
                      </span>
                    </div>
                  )}
                  <label className="flex items-center gap-2 justify-center h-5 cursor-pointer">
                    <Checkbox
                      id="is_negotiable"
                      checked={watchIsNegotiable}
                      onCheckedChange={(checked) => {
                        setValue("is_negotiable", !!checked);
                        if (checked) {
                          setValue("price", "");
                          setDisplayPrice("");
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Тохиролцоно</span>
                  </label>
                </div>
                {errors.price && (
                  <p className="text-xs text-destructive mt-2">{errors.price.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="bg-card rounded-2xl ring-1 ring-border p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Phone className="h-4.5 w-4.5 text-foreground" />
                  </div>
                  <div className="min-h-10 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm leading-tight">Утас</h3>
                    <p className="text-xs text-muted-foreground leading-tight">Холбоо барих</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end gap-1.5">
                  <Input
                    type="tel"
                    value={displayPhone}
                    onChange={handlePhoneChange}
                    placeholder="+976 9911-2233"
                    className="h-11 text-center font-medium tabular"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground text-center h-5 flex items-center justify-center">
                    Захиалагч холбогдоно
                  </p>
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive mt-2">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Service Type */}
          <section>
            <div className="mb-4">
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                Үйлчилгээний төрөл
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Та хэнд очих уу, эсвэл үйлчлүүлэгч танайд ирэх үү
              </p>
            </div>

            <div className="bg-card rounded-2xl ring-1 ring-border p-5">
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all",
                    watchServiceType === "on_site"
                      ? "bg-foreground text-background"
                      : "bg-muted/40 ring-1 ring-border hover:ring-foreground"
                  )}
                >
                  <input
                    type="radio"
                    value="on_site"
                    {...register("service_type")}
                    className="sr-only"
                  />
                  <MapPin className="h-6 w-6" />
                  <span className="text-sm font-medium text-center">Зочны газар</span>
                  <span
                    className={cn(
                      "text-xs text-center",
                      watchServiceType === "on_site"
                        ? "text-background/70"
                        : "text-muted-foreground"
                    )}
                  >
                    Үйлчлүүлэгч дээр очно
                  </span>
                </label>
                <label
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all",
                    watchServiceType === "remote"
                      ? "bg-foreground text-background"
                      : "bg-muted/40 ring-1 ring-border hover:ring-foreground"
                  )}
                >
                  <input
                    type="radio"
                    value="remote"
                    {...register("service_type")}
                    className="sr-only"
                  />
                  <Building2 className="h-6 w-6" />
                  <span className="text-sm font-medium text-center">Миний газар</span>
                  <span
                    className={cn(
                      "text-xs text-center",
                      watchServiceType === "remote" ? "text-background/70" : "text-muted-foreground"
                    )}
                  >
                    Үйлчлүүлэгч ирнэ
                  </span>
                </label>
              </div>

              {/* Detailed address and map - only when remote is selected */}
              {watchServiceType === "remote" && (
                <div className="mt-5 pt-5 border-t border-border space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="address_detail"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
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

                  <LocationPickerMap
                    coordinates={locationCoordinates}
                    onCoordinatesChange={(coords, address) => {
                      setLocationCoordinates(coords);
                      if (coords) {
                        setValue("latitude", coords[0]);
                        setValue("longitude", coords[1]);
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
          </section>

          {/* Images */}
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Зураг</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Эхний зураг нүүр зураг болно</p>
              </div>
              <div className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-muted text-sm tabular">
                <span className="font-semibold">{images.length}</span>
                <span className="text-muted-foreground">/ 3</span>
              </div>
            </div>

            <div className="bg-card rounded-2xl ring-1 ring-border p-5">
              <ImageUpload
                images={images}
                onChange={setImages}
                maxImages={3}
                onUpload={handleBackgroundUpload}
              />
              {images.length === 0 && (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground bg-muted/40 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm">Зар нэмэхийн тулд дор хаяж 1 зураг оруулна уу</p>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting || isSavingDraft}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors order-3 sm:order-1 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Болих
            </button>

            <button
              type="button"
              onClick={saveDraft}
              disabled={isSubmitting || isSavingDraft}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-medium border border-border bg-card hover:bg-muted transition-colors order-2 disabled:opacity-50"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Хадгалж байна…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Ноорог хадгалах
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isSavingDraft || (images.length === 0 && !editingDraftId)}
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 active:scale-[0.98] transition-all order-1 sm:order-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {editingDraftId ? "Нийтэлж байна…" : "Үүсгэж байна…"}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  {editingDraftId ? "Нийтлэх" : "Зар нэмэх"}
                </>
              )}
            </button>
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
