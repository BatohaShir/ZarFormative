"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { LocationPickerMap } from "@/components/location-picker-map";
import {
  Send,
  Loader2,
  CheckCircle,
  MessageSquare,
  MapPin,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  ImageIcon,
  Phone,
} from "lucide-react";
import Image from "next/image";
import { uploadRequestImage } from "@/lib/storage/requests";
import { compressImage, formatBytes } from "@/lib/image-compression";
import {
  useCreatelisting_requests,
  useFindFirstlisting_requests,
  useCreatenotifications,
} from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { CACHE_TIMES } from "@/lib/react-query-config";
import { cn } from "@/lib/utils";

interface RequestFormProps {
  listingId: string;
  listingTitle: string;
  providerId: string;
  providerName: string;
  serviceType?: "on_site" | "remote"; // Тип услуги - с выездом или на месте
}

// Генерируем дни для календаря
function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const days: (number | null)[] = [];

  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return days;
}

const monthNames = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар",
  "5-р сар", "6-р сар", "7-р сар", "8-р сар",
  "9-р сар", "10-р сар", "11-р сар", "12-р сар"
];

const weekDays = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

// Time Wheel Picker Component (iOS-style)
interface TimeWheelPickerProps {
  selectedDate: Date | null;
  selectedTime: string;
  onTimeSelect: (time: string) => void;
  onCancel: () => void;
}

function TimeWheelPicker({ selectedDate, selectedTime, onTimeSelect, onCancel }: TimeWheelPickerProps) {
  const ITEM_HEIGHT = 40;

  // Проверяем, сегодня ли выбранная дата
  const isToday = React.useMemo(() => {
    if (!selectedDate) return false;
    const now = new Date();
    return (
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  }, [selectedDate]);

  // Вычисляем минимальное доступное время (текущее + 30 мин буфера)
  const minTime = React.useMemo(() => {
    if (!isToday) return { hour: 0, minute: 0 };
    const now = new Date();
    let minMinutes = now.getHours() * 60 + now.getMinutes() + 30;
    // Округляем вверх до следующей минуты
    const minHour = Math.floor(minMinutes / 60);
    const minMinute = minMinutes % 60;
    return { hour: Math.min(minHour, 23), minute: minHour >= 24 ? 59 : minMinute };
  }, [isToday]);

  // Генерируем доступные часы (для сегодня - только будущие)
  const availableHours = React.useMemo(() => {
    if (!isToday) return Array.from({ length: 24 }, (_, i) => i);
    return Array.from({ length: 24 - minTime.hour }, (_, i) => i + minTime.hour);
  }, [isToday, minTime.hour]);

  // Получаем минимальную минуту для конкретного часа
  const getMinMinuteForHour = React.useCallback((hour: number) => {
    if (!isToday) return 0;
    if (hour > minTime.hour) return 0;
    if (hour === minTime.hour) return minTime.minute;
    return 59; // Этот час уже прошел полностью
  }, [isToday, minTime]);

  // Генерируем доступные минуты для выбранного часа
  const getAvailableMinutes = React.useCallback((hour: number) => {
    const minMinute = getMinMinuteForHour(hour);
    return Array.from({ length: 60 - minMinute }, (_, i) => i + minMinute);
  }, [getMinMinuteForHour]);

  // Parse initial time or default to first available time
  const getInitialTime = React.useCallback(() => {
    if (selectedTime) {
      const [h, m] = selectedTime.split(":").map(Number);
      // Проверяем что время валидно
      if (!isToday || (h > minTime.hour || (h === minTime.hour && m >= minTime.minute))) {
        return { hour: h, minute: m };
      }
    }
    // Дефолт - первое доступное время
    return { hour: availableHours[0] || 0, minute: getMinMinuteForHour(availableHours[0] || 0) };
  }, [selectedTime, isToday, minTime, availableHours, getMinMinuteForHour]);

  const [selectedHour, setSelectedHour] = React.useState(getInitialTime().hour);
  const [selectedMinute, setSelectedMinute] = React.useState(getInitialTime().minute);

  // Текущие доступные минуты для выбранного часа
  const availableMinutes = React.useMemo(() => getAvailableMinutes(selectedHour), [getAvailableMinutes, selectedHour]);

  const hourRef = React.useRef<HTMLDivElement>(null);
  const minuteRef = React.useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Корректируем минуты когда меняется час
  React.useEffect(() => {
    const minMinute = getMinMinuteForHour(selectedHour);
    if (selectedMinute < minMinute) {
      setSelectedMinute(minMinute);
      // Прокручиваем к новой минуте
      if (minuteRef.current) {
        const minuteIndex = availableMinutes.indexOf(minMinute);
        if (minuteIndex >= 0) {
          minuteRef.current.scrollTo({
            top: minuteIndex * ITEM_HEIGHT,
            behavior: "smooth",
          });
        }
      }
    }
  }, [selectedHour, selectedMinute, getMinMinuteForHour, availableMinutes]);

  // Scroll to selected value on mount
  React.useEffect(() => {
    if (hourRef.current) {
      const hourIndex = availableHours.indexOf(selectedHour);
      if (hourIndex >= 0) {
        hourRef.current.scrollTop = hourIndex * ITEM_HEIGHT;
      }
    }
    if (minuteRef.current) {
      const minuteIndex = availableMinutes.indexOf(selectedMinute);
      if (minuteIndex >= 0) {
        minuteRef.current.scrollTop = minuteIndex * ITEM_HEIGHT;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle scroll for hours
  const handleHourScroll = React.useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (!hourRef.current) return;
      const scrollTop = hourRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, availableHours.length - 1));
      const newHour = availableHours[clampedIndex];
      if (newHour !== undefined) {
        setSelectedHour(newHour);
        hourRef.current.scrollTo({
          top: clampedIndex * ITEM_HEIGHT,
          behavior: "smooth",
        });
      }
    }, 100);
  }, [availableHours]);

  // Handle scroll for minutes
  const handleMinuteScroll = React.useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (!minuteRef.current) return;
      const scrollTop = minuteRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, availableMinutes.length - 1));
      const newMinute = availableMinutes[clampedIndex];
      if (newMinute !== undefined) {
        setSelectedMinute(newMinute);
        minuteRef.current.scrollTo({
          top: clampedIndex * ITEM_HEIGHT,
          behavior: "smooth",
        });
      }
    }, 100);
  }, [availableMinutes]);

  const handleConfirm = () => {
    const time = `${selectedHour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`;
    onTimeSelect(time);
  };

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* Picker area */}
      <div className="relative flex justify-center items-center py-4">
        {/* Selection highlight */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-10 bg-primary/10 rounded-lg pointer-events-none border border-primary/20" />

        {/* Hour wheel */}
        <div
          ref={hourRef}
          className="w-16 h-50 overflow-y-auto scrollbar-hide snap-y snap-mandatory"
          onScroll={handleHourScroll}
          style={{ scrollSnapType: "y mandatory" }}
        >
          {/* Padding for centering */}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
          {availableHours.map((hour) => (
            <div
              key={hour}
              className={cn(
                "h-10 flex items-center justify-center text-lg font-medium snap-center transition-all",
                selectedHour === hour
                  ? "text-primary scale-110"
                  : "text-muted-foreground"
              )}
              style={{ scrollSnapAlign: "center" }}
            >
              {hour.toString().padStart(2, "0")}
            </div>
          ))}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
        </div>

        {/* Separator */}
        <div className="text-2xl font-bold text-primary mx-2">:</div>

        {/* Minute wheel */}
        <div
          ref={minuteRef}
          className="w-16 h-50 overflow-y-auto scrollbar-hide snap-y snap-mandatory"
          onScroll={handleMinuteScroll}
          style={{ scrollSnapType: "y mandatory" }}
        >
          <div style={{ height: ITEM_HEIGHT * 2 }} />
          {availableMinutes.map((minute) => (
            <div
              key={minute}
              className={cn(
                "h-10 flex items-center justify-center text-lg font-medium snap-center transition-all",
                selectedMinute === minute
                  ? "text-primary scale-110"
                  : "text-muted-foreground"
              )}
              style={{ scrollSnapAlign: "center" }}
            >
              {minute.toString().padStart(2, "0")}
            </div>
          ))}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Болих
        </button>
        <div className="w-px bg-border" />
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          Сонгох
        </button>
      </div>
    </div>
  );
}

// Форматирование монгольского номера телефона (+976 9911-2233)
function formatMongolianPhone(value: string): string {
  // Убираем всё кроме цифр
  let digits = value.replace(/\D/g, "");

  // Если начинается с 976, убираем код страны (пользователь ввёл с кодом)
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
}

// Получить чистые цифры из форматированного номера (без кода страны)
function getPhoneDigits(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  // Убираем код страны 976 если есть
  if (digits.startsWith("976")) {
    return digits.slice(3);
  }
  return digits;
}

// Нормализует дату к началу дня в локальном timezone для корректного сохранения
// Это предотвращает смещение даты при конвертации между timezone
function normalizeToLocalDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0); // Устанавливаем полдень чтобы избежать edge cases
  return normalized;
}

export function RequestForm({
  listingId,
  listingTitle,
  providerId,
  providerName,
  serviceType = "on_site",
}: RequestFormProps) {
  const { user, profile, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Location state (только для услуг с выездом - on_site)
  const [locationCoordinates, setLocationCoordinates] = React.useState<[number, number] | null>(null);
  const [locationAddress, setLocationAddress] = React.useState<string | null>(null);

  // Phone state (для всех типов услуг)
  const [clientPhone, setClientPhone] = React.useState("");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [messageTouched, setMessageTouched] = React.useState(false);

  // Date & Time state
  // Мемоизируем "сегодня" чтобы избежать пересоздания при каждом рендере
  const today = React.useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = React.useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string>("");
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [showTimeSelector, setShowTimeSelector] = React.useState(false);

  // Image state
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [isCompressingImage, setIsCompressingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check if user is the owner of the listing
  const isOwner = user?.id === providerId;

  // Auto-fill phone from profile when dialog opens
  React.useEffect(() => {
    if (open && profile?.phone_number && !clientPhone) {
      setClientPhone(formatMongolianPhone(profile.phone_number));
    }
  }, [open, profile?.phone_number, clientPhone]);

  // Calculate max date (2 months from today)
  const maxDate = React.useMemo(() => {
    const max = new Date(today);
    max.setMonth(max.getMonth() + 2);
    return max;
  }, [today]);

  // Check if user already has an active request for this listing
  const { data: existingRequest, refetch: refetchExisting } = useFindFirstlisting_requests(
    {
      where: {
        listing_id: listingId,
        client_id: user?.id || "",
        status: {
          in: ["pending", "accepted", "in_progress"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    },
    {
      enabled: !!user?.id && !isOwner,
      ...CACHE_TIMES.SERVICE_REQUESTS,
    }
  );

  // Create request mutation
  const createRequest = useCreatelisting_requests();
  const createNotification = useCreatenotifications();

  // Мемоизируем генерацию дней календаря
  const calendarDays = React.useMemo(
    () => generateCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setMessage("");
      setLocationCoordinates(null);
      setLocationAddress(null);
      setClientPhone("");
      setSelectedDate(null);
      setSelectedTime("");
      setShowCalendar(false);
      setShowTimeSelector(false);
      setIsSuccess(false);
      // Reset validation states
      setPhoneError(null);
      setMessageTouched(false);
      // Cleanup image
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("Зөвхөн зураг файл оруулна уу");
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Зураг 5MB-ээс бага байх ёстой");
      return;
    }

    // Cleanup old preview
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    // Compress image before setting
    setIsCompressingImage(true);
    try {
      const result = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        outputFormat: "webp",
      });

      // Log compression savings
      if (result.compressionRatio < 0.8) {
        const savings = Math.round((1 - result.compressionRatio) * 100);
        console.log(
          `[RequestForm] Compressed: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${savings}% savings)`
        );
      }

      setSelectedImage(result.file);
      setImagePreview(URL.createObjectURL(result.file));
    } catch (err) {
      console.error("[RequestForm] Compression error:", err);
      // Fallback: use original file
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLocationChange = (coords: [number, number] | null, address?: string | null) => {
    setLocationCoordinates(coords);
    if (address !== undefined) {
      setLocationAddress(address);
    }
  };

  const handlePrevMonth = () => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Check if prev month is before current month
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    if (prevYear < todayYear || (prevYear === todayYear && prevMonth < todayMonth)) {
      return; // Don't go back before current month
    }

    setCurrentMonth(prevMonth);
    setCurrentYear(prevYear);
  };

  const handleNextMonth = () => {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    // Check if next month is after max date
    if (nextYear > maxDate.getFullYear() ||
        (nextYear === maxDate.getFullYear() && nextMonth > maxDate.getMonth())) {
      return; // Don't go beyond 2 months
    }

    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  };

  const handleDateSelect = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (date >= todayStart && date <= maxDate) {
      setSelectedDate(date);
      setSelectedTime(""); // Reset time when date changes
      setShowCalendar(false); // Auto-close calendar
    }
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart || date > maxDate;
  };

  // Check if can go prev/next month
  const canGoPrev = React.useMemo(() => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return !(prevYear < today.getFullYear() || (prevYear === today.getFullYear() && prevMonth < today.getMonth()));
  }, [currentMonth, currentYear, today]);

  const canGoNext = React.useMemo(() => {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    return !(nextYear > maxDate.getFullYear() || (nextYear === maxDate.getFullYear() && nextMonth > maxDate.getMonth()));
  }, [currentMonth, currentYear, maxDate]);

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return "";
    return `${selectedDate.getFullYear()}.${(selectedDate.getMonth() + 1).toString().padStart(2, "0")}.${selectedDate.getDate().toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("Нэвтрэх шаардлагатай");
      return;
    }

    if (!message.trim()) {
      toast.error("Мессеж бичнэ үү");
      return;
    }

    // Проверка номера телефона (обязательно для всех, должно быть 8 цифр)
    const phoneDigits = getPhoneDigits(clientPhone);
    if (phoneDigits.length !== 8) {
      toast.error("Утасны дугаар 8 оронтой байх ёстой");
      return;
    }

    // Проверка обязательности местоположения для услуг с выездом
    if (serviceType === "on_site" && !locationCoordinates) {
      toast.error("Газрын зураг дээр байршил сонгоно уу");
      return;
    }

    // Валидация формата времени (HH:mm)
    if (selectedTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(selectedTime)) {
      toast.error("Цагийн формат буруу байна");
      return;
    }

    // OPTIMISTIC UPDATE: Show success state immediately
    setIsSuccess(true);

    try {
      // Upload image first if selected
      let uploadedImageUrl: string | null = null;
      if (selectedImage) {
        setIsUploadingImage(true);
        const uuid = crypto.randomUUID();
        const result = await uploadRequestImage(user.id, selectedImage, uuid);
        setIsUploadingImage(false);

        if (result.error) {
          // ROLLBACK: Revert optimistic update on image upload error
          setIsSuccess(false);
          toast.error(`Зураг оруулахад алдаа: ${result.error}`);
          return;
        }
        uploadedImageUrl = result.url;
      }

      const newRequest = await createRequest.mutateAsync({
        data: {
          listing_id: listingId,
          client_id: user.id,
          provider_id: providerId,
          message: message.trim(),
          status: "pending",
          client_phone: getPhoneDigits(clientPhone),
          // Для on_site сохраняем координаты и адрес
          latitude: serviceType === "on_site" ? locationCoordinates?.[0] : null,
          longitude: serviceType === "on_site" ? locationCoordinates?.[1] : null,
          address_detail: serviceType === "on_site" ? locationAddress : null,
          preferred_date: selectedDate ? normalizeToLocalDate(selectedDate) : null,
          preferred_time: selectedTime || null,
          note: null,
          image_url: uploadedImageUrl,
        },
      });

      // Send notification to provider about new request (fire and forget)
      if (newRequest) {
        createNotification.mutate({
          data: {
            user_id: providerId,
            type: "new_request",
            title: "Шинэ хүсэлт",
            message: `"${listingTitle}" үйлчилгээнд шинэ хүсэлт ирлээ`,
            request_id: newRequest.id,
            actor_id: user.id,
          },
        });
        // Invalidate caches - triggers immediate refetch for all subscribers
        // listing_requests invalidation ensures provider sees new request immediately
        // (backup for realtime - works even if Supabase Realtime is not configured)
        queryClient.invalidateQueries({ queryKey: ["listing_requests"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }

      toast.success("Хүсэлт амжилттай илгээгдлээ!");

      // Refetch to update existing request status
      refetchExisting();

      // Close dialog after 1.5 seconds (faster since we already showed success)
      // Note: form state (including isSuccess) is reset in handleOpenChange when dialog closes
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (error) {
      // ROLLBACK: Revert optimistic update on error
      setIsSuccess(false);
      toast.error(error instanceof Error ? error.message : "Хүсэлт илгээхэд алдаа гарлаа");
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setOpen(true);
  };

  // Don't show button if user is owner
  if (isOwner) {
    return null;
  }

  // Show "already sent" state if there's an active request
  // Статусы, при которых нельзя отправить повторно: pending, accepted, in_progress
  // Можно отправить повторно при: rejected, cancelled_by_client, cancelled_by_provider, completed
  if (existingRequest) {
    const statusMessages: Record<string, { title: string; description: string; color: string }> = {
      pending: {
        title: "Хүсэлт хүлээгдэж байна",
        description: "Таны хүсэлт үйлчилгээ үзүүлэгчид илгээгдсэн. Хариуг хүлээнэ үү.",
        color: "amber",
      },
      accepted: {
        title: "Хүсэлт зөвшөөрөгдсөн",
        description: "Үйлчилгээ үзүүлэгч таны хүсэлтийг хүлээн авсан байна.",
        color: "green",
      },
      in_progress: {
        title: "Ажил явагдаж байна",
        description: "Үйлчилгээ үзүүлэгч таны захиалгыг гүйцэтгэж байна.",
        color: "blue",
      },
    };

    const status = existingRequest.status as keyof typeof statusMessages;
    const message = statusMessages[status] || statusMessages.pending;

    const colorClasses = {
      amber: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400",
      green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",
      blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
    };

    return (
      <div className={`p-4 border rounded-lg ${colorClasses[message.color as keyof typeof colorClasses]}`}>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{message.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {message.description}
        </p>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="w-full" size="lg">
            <MessageSquare className="h-5 w-5 mr-2" />
            Хүсэлт илгээх
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/30 flex items-center justify-center mb-5 shadow-lg">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Хүсэлт илгээгдлээ!</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {providerName} таны хүсэлтийг хүлээн авсан бөгөөд удахгүй хариу өгөх болно.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b px-5 py-4 z-10">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-lg">Хүсэлт илгээх</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{providerName}</span> руу &quot;{listingTitle}&quot; үйлчилгээний талаар
                  </p>
                </DialogHeader>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-hidden">
                {/* Location Map - только для услуг с выездом */}
                {serviceType === "on_site" && (
                  <div className="space-y-2 overflow-hidden">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Байршил <span className="text-destructive">*</span>
                    </label>
                    <LocationPickerMap
                      coordinates={locationCoordinates}
                      onCoordinatesChange={handleLocationChange}
                    />
                  </div>
                )}

                {/* Date Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Огноо
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={cn(
                      "w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-dashed transition-all text-left group",
                      selectedDate
                        ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                        : "hover:bg-muted/50 hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        selectedDate
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      )}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <span className={cn("text-sm", selectedDate ? "font-medium" : "text-muted-foreground")}>
                        {selectedDate ? formatSelectedDate() : "Огноо сонгох"}
                      </span>
                    </div>
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(null);
                          setSelectedTime("");
                        }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </button>

                  {/* Calendar */}
                  {showCalendar && (
                    <div className="border rounded-xl p-4 bg-card shadow-sm">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handlePrevMonth}
                          disabled={!canGoPrev}
                          className="h-9 w-9 rounded-lg"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-semibold">
                          {currentYear} оны {monthNames[currentMonth]}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleNextMonth}
                          disabled={!canGoNext}
                          className="h-9 w-9 rounded-lg"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Week Days */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map((day) => (
                          <div
                            key={day}
                            className="text-center text-xs font-semibold text-muted-foreground py-2"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => (
                          <button
                            key={index}
                            type="button"
                            disabled={day === null || isDateDisabled(day)}
                            onClick={() => day && handleDateSelect(day)}
                            className={cn(
                              "h-10 w-full rounded-lg text-sm font-medium transition-all",
                              day === null && "invisible",
                              day && isDateDisabled(day) && "text-muted-foreground/30 cursor-not-allowed",
                              day && !isDateDisabled(day) && !isDateSelected(day) && "hover:bg-primary/10 hover:text-primary",
                              day && isDateSelected(day) && "bg-primary text-primary-foreground shadow-md",
                              day && isToday(day) && !isDateSelected(day) && "ring-2 ring-primary/50 ring-inset font-bold text-primary"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Selection - показываем только после выбора даты */}
                {selectedDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Цаг
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTimeSelector(!showTimeSelector)}
                      className={cn(
                        "w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-dashed transition-all text-left group",
                        selectedTime
                          ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                          : "hover:bg-muted/50 hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          selectedTime
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <span className={cn("text-sm", selectedTime ? "font-medium" : "text-muted-foreground")}>
                          {selectedTime || "Цаг сонгох"}
                        </span>
                      </div>
                      {selectedTime && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTime("");
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </button>

                    {/* Time picker with scroll wheels */}
                    {showTimeSelector && (
                      <TimeWheelPicker
                        selectedDate={selectedDate}
                        selectedTime={selectedTime}
                        onTimeSelect={(time) => {
                          setSelectedTime(time);
                          setShowTimeSelector(false);
                        }}
                        onCancel={() => setShowTimeSelector(false)}
                      />
                    )}
                  </div>
                )}

                {/* Photo Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Зураг
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  {isCompressingImage ? (
                    <div className="w-full flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-primary font-medium">Зураг шахаж байна...</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-primary/30 bg-muted">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 hover:bg-destructive/90 transition-colors shadow-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={createRequest.isPending || isUploadingImage}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all group",
                        "hover:bg-muted/50 hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Зураг оруулах</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG, WebP • 5MB хүртэл</p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Мессеж <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="Үйлчилгээний талаар дэлгэрэнгүй бичнэ үү..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onBlur={() => setMessageTouched(true)}
                    rows={4}
                    maxLength={2000}
                    disabled={createRequest.isPending || isUploadingImage}
                    className={cn(
                      "resize-none rounded-xl border-2 transition-colors",
                      messageTouched && !message.trim()
                        ? "border-destructive focus:border-destructive"
                        : "focus:border-primary/50"
                    )}
                  />
                  {messageTouched && !message.trim() && (
                    <p className="text-xs text-destructive">Мессеж заавал бичнэ үү</p>
                  )}
                  <p className="text-xs text-muted-foreground text-right">
                    {message.length}/2000
                  </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Утасны дугаар <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="+976 9911-2233"
                    value={clientPhone}
                    onChange={(e) => {
                      const formatted = formatMongolianPhone(e.target.value);
                      setClientPhone(formatted);
                      // Real-time validation
                      const digits = getPhoneDigits(formatted);
                      if (digits.length > 0 && digits.length < 8) {
                        setPhoneError("Утасны дугаар 8 оронтой байх ёстой");
                      } else {
                        setPhoneError(null);
                      }
                    }}
                    onBlur={() => {
                      const digits = getPhoneDigits(clientPhone);
                      if (digits.length > 0 && digits.length < 8) {
                        setPhoneError("Утасны дугаар 8 оронтой байх ёстой");
                      } else if (digits.length === 0) {
                        setPhoneError("Утасны дугаар заавал бичнэ үү");
                      }
                    }}
                    disabled={createRequest.isPending || isUploadingImage}
                    className={cn(
                      "rounded-xl border-2 transition-colors",
                      phoneError ? "border-destructive focus:border-destructive" : "focus:border-primary/50"
                    )}
                    maxLength={15}
                  />
                  {phoneError ? (
                    <p className="text-xs text-destructive">{phoneError}</p>
                  ) : getPhoneDigits(clientPhone).length === 8 ? (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Дугаар зөв байна
                    </p>
                  ) : null}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-3 sticky bottom-0 bg-background pb-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 rounded-xl"
                    onClick={() => setOpen(false)}
                    disabled={createRequest.isPending || isUploadingImage}
                  >
                    Болих
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-xl"
                    disabled={createRequest.isPending || isUploadingImage || isCompressingImage || !message.trim() || getPhoneDigits(clientPhone).length !== 8}
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Зураг оруулж байна...
                      </>
                    ) : createRequest.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Илгээж байна...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Илгээх
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={handleLoginSuccess}
        title="Хүсэлт илгээхийн тулд нэвтэрнэ үү"
        description="Үйлчилгээ үзүүлэгч рүү хүсэлт илгээхийн тулд эхлээд нэвтрэх шаардлагатай."
        icon={MessageSquare}
      />
    </>
  );
}
