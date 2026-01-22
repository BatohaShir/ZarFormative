"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { AddressSelectModal, AddressData } from "@/components/address-select-modal";
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
} from "lucide-react";
import Image from "next/image";
import { uploadRequestImage } from "@/lib/storage/requests";
import {
  useCreatelisting_requests,
  useFindFirstlisting_requests,
  useCreatenotifications,
} from "@/lib/hooks";
import { CACHE_TIMES } from "@/lib/react-query-config";
import { cn } from "@/lib/utils";

interface RequestFormProps {
  listingId: string;
  listingTitle: string;
  providerId: string;
  providerName: string;
  serviceType?: "on_site" | "remote"; // Тип услуги - с выездом или на месте
}

interface ScheduleData {
  busySlots: Array<{
    start: string;
    end: string;
  }>;
  unavailableSlots: string[];
  currentListingDuration: number;
  workHoursStart: string;
  workHoursEnd: string;
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

// Форматирование длительности
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} цаг`;
  return `${hours} цаг ${mins} мин`;
}

export function RequestForm({
  listingId,
  listingTitle,
  providerId,
  providerName,
  serviceType = "on_site",
}: RequestFormProps) {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showAddressModal, setShowAddressModal] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Address state (только для услуг с выездом)
  const [selectedAddress, setSelectedAddress] = React.useState<AddressData | null>(null);

  // Date & Time state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string>("");
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [showTimeSelector, setShowTimeSelector] = React.useState(false);

  // Schedule state
  const [scheduleData, setScheduleData] = React.useState<ScheduleData | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = React.useState(false);

  // Image state
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check if user is the owner of the listing
  const isOwner = user?.id === providerId;

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

  // Динамическая генерация часов для расписания на основе рабочих часов
  const scheduleHours = React.useMemo(() => {
    if (!scheduleData) return [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // Default
    const startH = parseInt(scheduleData.workHoursStart.split(":")[0]);
    const endH = parseInt(scheduleData.workHoursEnd.split(":")[0]);
    return Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);
  }, [scheduleData]);

  // Fetch schedule data when date is selected
  React.useEffect(() => {
    if (!selectedDate || !providerId) {
      setScheduleData(null);
      return;
    }

    const fetchSchedule = async () => {
      setIsLoadingSchedule(true);
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const response = await fetch(
          `/api/schedule?providerId=${providerId}&date=${dateStr}&listingId=${listingId}`
        );
        if (response.ok) {
          const data = await response.json();
          setScheduleData(data);
          // Сбрасываем выбранное время если оно стало недоступным
          if (selectedTime && data.unavailableSlots.includes(selectedTime)) {
            setSelectedTime("");
          }
        }
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    fetchSchedule();
  }, [selectedDate, providerId, listingId, selectedTime]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setMessage("");
      setSelectedAddress(null);
      setSelectedDate(null);
      setSelectedTime("");
      setShowCalendar(false);
      setShowTimeSelector(false);
      setIsSuccess(false);
      setScheduleData(null);
      // Cleanup image
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
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

  const handleAddressSelect = (address: AddressData) => {
    setSelectedAddress(address);
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

  const isTimeSlotUnavailable = (time: string) => {
    return scheduleData?.unavailableSlots.includes(time) ?? false;
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

    // Проверка обязательности адреса для услуг с выездом
    if (serviceType === "on_site" && !selectedAddress) {
      toast.error("Байршил сонгоно уу");
      return;
    }

    // Проверка занятости слота перед отправкой
    if (selectedTime && isTimeSlotUnavailable(selectedTime)) {
      toast.error("Энэ цаг завгүй байна. Өөр цаг сонгоно уу.");
      return;
    }

    try {
      // Upload image first if selected
      let uploadedImageUrl: string | null = null;
      if (selectedImage) {
        setIsUploadingImage(true);
        const uuid = crypto.randomUUID();
        const result = await uploadRequestImage(user.id, selectedImage, uuid);
        setIsUploadingImage(false);

        if (result.error) {
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
          aimag_id: serviceType === "on_site" ? (selectedAddress?.cityId || null) : null,
          district_id: serviceType === "on_site" ? (selectedAddress?.districtId || null) : null,
          khoroo_id: serviceType === "on_site" ? (selectedAddress?.khorooId || null) : null,
          address_detail: null,
          preferred_date: selectedDate || null,
          preferred_time: selectedTime || null,
          note: null,
          image_url: uploadedImageUrl,
        },
      });

      // Send notification to provider about new request
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
      }

      setIsSuccess(true);
      toast.success("Хүсэлт амжилттай илгээгдлээ!");

      // Refetch to update existing request status
      refetchExisting();

      // Close dialog after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        setSelectedAddress(null);
                setSelectedDate(null);
        setSelectedTime("");
        setIsSuccess(false);
        setScheduleData(null);
        // Cleanup image
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }
        setSelectedImage(null);
        setImagePreview(null);
      }, 2000);
    } catch (error) {
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

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Address Selection - только для услуг с выездом */}
                {serviceType === "on_site" && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Байршил <span className="text-destructive">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(true)}
                      className={cn(
                        "w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-dashed transition-all text-left group",
                        selectedAddress
                          ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                          : "hover:bg-muted/50 hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          selectedAddress
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          {selectedAddress ? (
                            <>
                              <div className="text-sm font-medium">{selectedAddress.city}, {selectedAddress.district}</div>
                              <div className="text-xs text-muted-foreground">{selectedAddress.khoroo}</div>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Хаяг сонгох</span>
                          )}
                        </div>
                      </div>
                      {selectedAddress && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAddress(null);
                                                      }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </button>

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
                          setScheduleData(null);
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
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm", selectedTime ? "font-medium" : "text-muted-foreground")}>
                            {selectedTime || "Цаг сонгох"}
                          </span>
                          {isLoadingSchedule && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
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

                    {/* Time selector dropdown */}
                    {showTimeSelector && (
                      <div className="space-y-3">
                        {/* Loading state */}
                        {isLoadingSchedule && (
                          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Цагийн хуваарь ачаалж байна...</span>
                          </div>
                        )}

                        {/* Show schedule only when data is loaded */}
                        {!isLoadingSchedule && scheduleData && (
                          <>
                            {/* Work hours info */}
                            <div className="flex items-center justify-between gap-2 text-xs bg-indigo-50 dark:bg-indigo-950/30 rounded-lg px-3 py-2 border border-indigo-200 dark:border-indigo-800">
                              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Ажлын цаг: <strong>{scheduleData.workHoursStart} - {scheduleData.workHoursEnd}</strong></span>
                              </div>
                              {scheduleData.currentListingDuration > 0 && (
                                <span className="text-muted-foreground">
                                  ({formatDuration(scheduleData.currentListingDuration)})
                                </span>
                              )}
                            </div>

                            {/* Time slots table */}
                            <div className="border rounded-xl overflow-hidden bg-card">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-xs font-semibold text-muted-foreground py-2 px-3 text-left w-16">Цаг</th>
                                <th className="text-xs font-semibold text-muted-foreground py-2 px-2 text-center">:00</th>
                                <th className="text-xs font-semibold text-muted-foreground py-2 px-2 text-center">:30</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scheduleHours.map((hour) => {
                                const time00 = `${hour.toString().padStart(2, "0")}:00`;
                                const time30 = `${hour.toString().padStart(2, "0")}:30`;
                                const isUnavailable00 = isTimeSlotUnavailable(time00);
                                const isUnavailable30 = isTimeSlotUnavailable(time30);
                                const isSelected00 = selectedTime === time00;
                                const isSelected30 = selectedTime === time30;

                                // Показываем :30 только если это не последний час или конец рабочего дня >= :30
                                const endH = scheduleData ? parseInt(scheduleData.workHoursEnd.split(":")[0]) : 18;
                                const endM = scheduleData ? parseInt(scheduleData.workHoursEnd.split(":")[1]) : 0;
                                const showTime30 = hour < endH || (hour === endH && endM >= 30);

                                return (
                                  <tr key={hour} className="border-t border-muted/50">
                                    <td className="text-sm font-medium text-muted-foreground py-1.5 px-3 bg-muted/30">
                                      {hour.toString().padStart(2, "0")}
                                    </td>
                                    <td className="py-1 px-1">
                                      <button
                                        type="button"
                                        disabled={isUnavailable00 || isLoadingSchedule}
                                        onClick={() => {
                                          if (!isUnavailable00) {
                                            setSelectedTime(time00);
                                            setShowTimeSelector(false);
                                          }
                                        }}
                                        className={cn(
                                          "w-full py-2 px-1 text-sm font-medium rounded-lg transition-all",
                                          isUnavailable00 && "bg-red-50 dark:bg-red-950/30 text-red-400 dark:text-red-500 cursor-not-allowed line-through",
                                          !isUnavailable00 && !isSelected00 && "hover:bg-primary/10 hover:text-primary",
                                          isSelected00 && "bg-primary text-primary-foreground shadow-md"
                                        )}
                                      >
                                        {time00}
                                      </button>
                                    </td>
                                    <td className="py-1 px-1">
                                      {showTime30 ? (
                                        <button
                                          type="button"
                                          disabled={isUnavailable30 || isLoadingSchedule}
                                          onClick={() => {
                                            if (!isUnavailable30) {
                                              setSelectedTime(time30);
                                              setShowTimeSelector(false);
                                            }
                                          }}
                                          className={cn(
                                            "w-full py-2 px-1 text-sm font-medium rounded-lg transition-all",
                                            isUnavailable30 && "bg-red-50 dark:bg-red-950/30 text-red-400 dark:text-red-500 cursor-not-allowed line-through",
                                            !isUnavailable30 && !isSelected30 && "hover:bg-primary/10 hover:text-primary",
                                            isSelected30 && "bg-primary text-primary-foreground shadow-md"
                                          )}
                                        >
                                          {time30}
                                        </button>
                                      ) : (
                                        <div className="w-full py-2 px-1 text-sm text-muted-foreground/30 text-center">—</div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Legend */}
                        {scheduleData && scheduleData.busySlots.length > 0 && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800" />
                              <span>Завгүй</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded bg-primary" />
                              <span>Сонгосон</span>
                            </div>
                          </div>
                        )}
                          </>
                        )}
                      </div>
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
                  {imagePreview ? (
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
                    rows={4}
                    maxLength={2000}
                    disabled={createRequest.isPending || isUploadingImage}
                    className="resize-none rounded-xl border-2 focus:border-primary/50 transition-colors"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {message.length}/2000
                  </p>
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
                    disabled={createRequest.isPending || isUploadingImage || !message.trim()}
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

      {/* Address Modal */}
      <AddressSelectModal
        open={showAddressModal}
        onOpenChange={setShowAddressModal}
        onSelect={handleAddressSelect}
        initialAddress={selectedAddress || undefined}
      />

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
