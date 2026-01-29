"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Send, CheckCircle, ChevronRight, X, Calendar, Clock, ChevronLeft, Star, ChevronDown } from "lucide-react";
import { AddressSelectModal, AddressData } from "@/components/address-select-modal";
import { cn } from "@/lib/utils";

interface ServiceRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: {
    name: string;
    avatar: string;
    rating?: number;
  };
  serviceTitle: string;
  onRequestSent?: () => void;
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

// Генерируем часы и минуты для iOS picker
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")); // 00-23
const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")); // 00-59

// iOS Style Scroll Picker Component - мемоизирован для предотвращения лишних ре-рендеров
const IOSPicker = React.memo(function IOSPicker({
  items,
  selectedIndex,
  onSelect,
  label,
  suffix = "",
}: {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label: string;
  suffix?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemHeight = 44;
  const visibleItems = 5;
  const centerOffset = Math.floor(visibleItems / 2);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = selectedIndex * itemHeight;
    }
  }, [selectedIndex]);

  const handleScroll = React.useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));
      if (clampedIndex !== selectedIndex) {
        onSelect(clampedIndex);
      }
    }
  }, [items.length, selectedIndex, onSelect]);

  // Debounced scroll handler
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleScrollDebounced = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(handleScroll, 50);
  };

  return (
    <div className="flex-1">
      <p className="text-xs text-muted-foreground text-center mb-2">{label}</p>
      <div className="relative h-[220px] overflow-hidden rounded-xl">
        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

        {/* Selection highlight */}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-11 bg-primary/10 rounded-lg border border-primary/20 z-0" />

        {/* Scrollable container */}
        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
          onScroll={handleScrollDebounced}
          style={{
            paddingTop: centerOffset * itemHeight,
            paddingBottom: centerOffset * itemHeight,
            scrollSnapType: "y mandatory",
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "h-11 flex items-center justify-center text-lg font-medium transition-all snap-center cursor-pointer",
                index === selectedIndex
                  ? "text-primary scale-110"
                  : "text-muted-foreground/60"
              )}
              onClick={() => {
                onSelect(index);
                if (containerRef.current) {
                  containerRef.current.scrollTo({
                    top: index * itemHeight,
                    behavior: "smooth",
                  });
                }
              }}
            >
              {item}{suffix}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export function ServiceRequestModal({
  open,
  onOpenChange,
  provider,
  serviceTitle,
  onRequestSent,
}: ServiceRequestModalProps) {
  const [message, setMessage] = React.useState("");
  const [address, setAddress] = React.useState<AddressData | null>(null);
  const [addressModalOpen, setAddressModalOpen] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Date & Time state
  // Мемоизируем "сегодня" чтобы избежать пересоздания при каждом рендере
  const today = React.useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = React.useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [selectedHourIndex, setSelectedHourIndex] = React.useState(0);
  const [selectedMinuteIndex, setSelectedMinuteIndex] = React.useState(0);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  // Мемоизируем генерацию дней календаря
  const calendarDays = React.useMemo(
    () => generateCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  // Вычисляем максимальную дату (2 месяца от сегодня)
  const maxDate = React.useMemo(() => {
    const max = new Date(today);
    max.setMonth(max.getMonth() + 2);
    return max;
  }, [today]);

  // Проверяем, выбрана ли сегодняшняя дата
  const isSelectedDateToday = React.useMemo(() => {
    if (!selectedDate) return false;
    const now = new Date();
    return (
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  }, [selectedDate]);

  // Минимальный доступный час для сегодня (текущий час + 1 для буфера)
  const minAvailableHour = React.useMemo(() => {
    if (!isSelectedDateToday) return 0;
    const now = new Date();
    // Если текущие минуты > 30, переходим на следующий час
    return now.getMinutes() > 30 ? now.getHours() + 1 : now.getHours();
  }, [isSelectedDateToday]);

  // Фильтрованные часы для picker (скрываем прошедшие для сегодня)
  const availableHours = React.useMemo(() => {
    if (!isSelectedDateToday) return hours;
    return hours.filter((_, index) => index >= minAvailableHour);
  }, [isSelectedDateToday, minAvailableHour]);

  // Корректируем индекс часа при смене на сегодня
  React.useEffect(() => {
    if (isSelectedDateToday && selectedHourIndex < minAvailableHour) {
      setSelectedHourIndex(minAvailableHour);
    }
  }, [isSelectedDateToday, minAvailableHour, selectedHourIndex]);

  const handlePrevMonth = React.useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = React.useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleDateSelect = React.useCallback((day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (date >= todayStart) {
      setSelectedDate(date);
      setShowCalendar(false);
      setShowTimePicker(true);
    }
  }, [currentYear, currentMonth, today]);

  const isDateDisabled = React.useCallback((day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Проверяем и минимальную (сегодня) и максимальную (2 месяца) дату
    return date < todayStart || date > maxDate;
  }, [currentYear, currentMonth, today, maxDate]);

  const isDateSelected = React.useCallback((day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  }, [selectedDate, currentMonth, currentYear]);

  const isToday = React.useCallback((day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  }, [today, currentMonth, currentYear]);

  const handleSubmit = React.useCallback(async () => {
    if (!message.trim() || !selectedDate) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
    onRequestSent?.();
  }, [message, selectedDate, onRequestSent]);

  const handleClose = React.useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setMessage("");
      setAddress(null);
      setSelectedDate(null);
      setSelectedHourIndex(0);
      setSelectedMinuteIndex(0);
      setShowCalendar(false);
      setShowTimePicker(false);
      setIsSubmitted(false);
    }, 300);
  }, [onOpenChange]);

  const handleAddressSelect = React.useCallback((selectedAddress: AddressData) => {
    setAddress(selectedAddress);
  }, []);

  const handleClearAddress = React.useCallback(() => {
    setAddress(null);
  }, []);

  const formatAddress = (addr: AddressData): string => {
    const parts = [addr.city, addr.district, addr.khoroo];
    return parts.join(", ");
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return "Огноо сонгох";
    // Унифицированный формат YYYY.MM.DD
    return `${selectedDate.getFullYear()}.${(selectedDate.getMonth() + 1).toString().padStart(2, "0")}.${selectedDate.getDate().toString().padStart(2, "0")}`;
  };

  const formatSelectedTime = () => {
    return `${hours[selectedHourIndex]}:${minutesList[selectedMinuteIndex]}`;
  };

  const formatSelectedDateTime = () => {
    if (!selectedDate) return null;
    return `${formatSelectedDate()} - ${formatSelectedTime()}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto p-0">
          {isSubmitted ? (
            <div className="py-12 px-6 text-center space-y-4">
              <div className="w-20 h-20 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Хүсэлт амжилттай илгээгдлээ!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {provider.name} таны хүсэлтийг хүлээн авч,<br />удахгүй холбогдох болно
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-left mt-6">
                <p className="text-xs text-muted-foreground mb-2">Захиалгын мэдээлэл</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Огноо, цаг:</span>
                    <span className="font-medium">{formatSelectedDateTime()}</span>
                  </div>
                  {address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Хаяг:</span>
                      <span className="font-medium text-right max-w-[200px] truncate">{formatAddress(address)}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={handleClose} className="mt-4 w-full" size="lg">
                Хаах
              </Button>
            </div>
          ) : (
            <>
              {/* Header */}
              <DialogHeader className="p-4 pb-0">
                <DialogTitle className="text-lg font-bold">Үйлчилгээ авах хүсэлт</DialogTitle>
              </DialogHeader>

              <div className="p-4 space-y-5">
                {/* Provider Info Card */}
                <div className="flex items-center gap-3 p-4 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
                  <div className="relative">
                    <Image
                      src={provider.avatar}
                      alt={provider.name}
                      width={56}
                      height={56}
                      unoptimized={provider.avatar.includes("dicebear")}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-base">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">{serviceTitle}</p>
                    {provider.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{provider.rating}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date & Time Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Огноо, цаг сонгох <span className="text-red-500">*</span>
                  </label>

                  {/* Date Selector Button */}
                  <button
                    onClick={() => {
                      setShowCalendar(!showCalendar);
                      setShowTimePicker(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                      selectedDate
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/30 border-dashed hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedDate ? "bg-primary text-white" : "bg-muted"
                      )}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">
                          {selectedDate ? formatSelectedDate() : "Огноо сонгох"}
                        </p>
                        {selectedDate && (
                          <p className="text-xs text-muted-foreground">
                            Цаг: {formatSelectedTime()}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      showCalendar && "rotate-180"
                    )} />
                  </button>

                  {/* Calendar Dropdown */}
                  {showCalendar && (
                    <div className="border rounded-xl p-4 bg-card animate-in slide-in-from-top-2 duration-200">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handlePrevMonth}
                          className="h-8 w-8"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold">
                          {currentYear} оны {monthNames[currentMonth]}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleNextMonth}
                          className="h-8 w-8"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Week Days */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map((day) => (
                          <div
                            key={day}
                            className="text-center text-xs font-medium text-muted-foreground py-1"
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
                            disabled={day === null || isDateDisabled(day)}
                            onClick={() => day && handleDateSelect(day)}
                            className={cn(
                              "h-10 w-full rounded-lg text-sm font-medium transition-all",
                              day === null && "invisible",
                              day && isDateDisabled(day) && "text-muted-foreground/40 cursor-not-allowed",
                              day && !isDateDisabled(day) && !isDateSelected(day) && "hover:bg-primary/10",
                              day && isDateSelected(day) && "bg-primary text-primary-foreground shadow-md",
                              day && isToday(day) && !isDateSelected(day) && "ring-2 ring-primary ring-inset"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* iOS Style Time Picker */}
                  {showTimePicker && selectedDate && (
                    <div className="border rounded-xl p-4 bg-card animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Цаг сонгох
                        </p>
                        <button
                          onClick={() => setShowTimePicker(false)}
                          className="text-xs text-primary font-medium"
                        >
                          Болсон
                        </button>
                      </div>

                      {/* iOS Style Picker */}
                      <div className="flex gap-4">
                        <IOSPicker
                          items={availableHours}
                          selectedIndex={isSelectedDateToday ? Math.max(0, selectedHourIndex - minAvailableHour) : selectedHourIndex}
                          onSelect={(index) => setSelectedHourIndex(isSelectedDateToday ? index + minAvailableHour : index)}
                          label="Цаг"
                        />
                        <div className="flex items-center justify-center text-2xl font-bold text-muted-foreground">
                          :
                        </div>
                        <IOSPicker
                          items={minutesList}
                          selectedIndex={selectedMinuteIndex}
                          onSelect={setSelectedMinuteIndex}
                          label="Минут"
                        />
                      </div>

                      {/* Selected Time Display */}
                      <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          {formatSelectedDateTime()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Хүсэлтийн дэлгэрэнгүй <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Юу хийлгэхийг хүсч байна вэ? Дэлгэрэнгүй бичнэ үү..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[100px] resize-none rounded-xl"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Хаяг (заавал биш)
                  </label>
                  {address ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-sm flex-1 line-clamp-2">{formatAddress(address)}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setAddressModalOpen(true)}
                        >
                          Өөрчлөх
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleClearAddress}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddressModalOpen(true)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-dashed hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="text-sm text-muted-foreground">
                        Үйлчилгээ авах хаяг сонгох...
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full h-12 text-base font-semibold rounded-xl shadow-lg"
                  onClick={handleSubmit}
                  disabled={!message.trim() || !selectedDate || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Илгээж байна...
                    </div>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Хүсэлт илгээх
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Үйлчилгээ үзүүлэгч таны хүсэлтийг хүлээн авч холбогдох болно
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Address Select Modal */}
      <AddressSelectModal
        open={addressModalOpen}
        onOpenChange={setAddressModalOpen}
        onSelect={handleAddressSelect}
        initialAddress={address || undefined}
      />
    </>
  );
}
