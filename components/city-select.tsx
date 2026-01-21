"use client";

import * as React from "react";
import { MapPin, ChevronDown, Search, Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFindManyaimags } from "@/lib/hooks/aimags";
import { useFindManydistricts } from "@/lib/hooks/districts";
import type { aimags, districts } from "@prisma/client";

interface CitySelectProps {
  trigger?: React.ReactNode | ((displayText: string) => React.ReactNode);
  onSelect?: (aimagId: string, aimagName: string, districtId: string, districtName: string) => void;
  value?: { aimagId: string; districtId: string };
}

const STORAGE_KEY = "uilchilgee_selected_location";

interface StoredLocation {
  aimagId: string;
  aimagName: string;
  districtId: string;
  districtName: string;
}

function getStoredLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeLocation(location: StoredLocation) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Ignore storage errors
  }
}

function clearStoredLocation() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function CitySelect({ trigger, onSelect, value }: CitySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedAimag, setSelectedAimag] = React.useState<aimags | null>(null);
  const [selectedDistrict, setSelectedDistrict] = React.useState<districts | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAimagList, setShowAimagList] = React.useState(true);

  // Загружаем аймаги из БД (кэш 24 часа - редко меняются)
  const { data: aimagsData, isLoading: isLoadingAimags } = useFindManyaimags(
    {
      where: {
        is_active: true,
      },
      orderBy: {
        sort_order: "asc",
      },
    },
    {
      staleTime: 24 * 60 * 60 * 1000, // 24 часа
      gcTime: 48 * 60 * 60 * 1000, // 48 часов
    }
  );

  // Pre-fetch всех районов при открытии диалога (устраняет waterfall)
  // Загружаем все районы сразу и фильтруем на клиенте
  const { data: allDistrictsData, isLoading: isLoadingDistricts } = useFindManydistricts(
    {
      where: {
        is_active: true,
      },
      orderBy: {
        sort_order: "asc",
      },
    },
    {
      staleTime: 24 * 60 * 60 * 1000, // 24 часа
      gcTime: 48 * 60 * 60 * 1000, // 48 часов
    }
  );

  const aimags = aimagsData || [];
  const allDistricts = allDistrictsData || [];

  // Фильтруем районы на клиенте по выбранному аймагу
  const districts = React.useMemo(() => {
    if (!selectedAimag) return [];
    return allDistricts.filter((d) => d.aimag_id === selectedAimag.id);
  }, [selectedAimag, allDistricts]);

  // Initialize from localStorage on mount
  React.useEffect(() => {
    const stored = getStoredLocation();
    if (value?.aimagId && aimags.length > 0) {
      const aimag = aimags.find((a) => a.id === value.aimagId) || null;
      setSelectedAimag(aimag);
    } else if (stored && aimags.length > 0) {
      const aimag = aimags.find((a) => a.id === stored.aimagId) || null;
      setSelectedAimag(aimag);
    }
  }, [value, aimags]);

  // Load district from storage after districts are loaded
  React.useEffect(() => {
    const stored = getStoredLocation();
    if (value?.districtId && districts.length > 0) {
      const district = districts.find((d) => d.id === value.districtId) || null;
      setSelectedDistrict(district);
    } else if (stored?.districtId && districts.length > 0) {
      const district = districts.find((d) => d.id === stored.districtId) || null;
      setSelectedDistrict(district);
    }
  }, [value, districts]);

  const filteredAimags = aimags.filter((aimag) =>
    aimag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAimagSelect = (aimag: aimags) => {
    setSelectedAimag(aimag);
    setSelectedDistrict(null);
    setShowAimagList(false);
  };

  const handleDistrictSelect = (district: districts) => {
    setSelectedDistrict(district);
    const location: StoredLocation = {
      aimagId: selectedAimag?.id || "",
      aimagName: selectedAimag?.name || "",
      districtId: district.id,
      districtName: district.name,
    };
    storeLocation(location);
    onSelect?.(location.aimagId, location.aimagName, location.districtId, location.districtName);
    setOpen(false);
  };

  const handleSelectWholeAimag = () => {
    if (selectedAimag) {
      const location: StoredLocation = {
        aimagId: selectedAimag.id,
        aimagName: selectedAimag.name,
        districtId: "",
        districtName: "",
      };
      storeLocation(location);
      onSelect?.(location.aimagId, location.aimagName, "", "");
      setOpen(false);
    }
  };

  const handleReset = () => {
    setSelectedAimag(null);
    setSelectedDistrict(null);
    setSearchQuery("");
    setShowAimagList(true);
    clearStoredLocation();
    onSelect?.("", "", "", "");
  };

  const handleChangeAimag = () => {
    setShowAimagList(true);
    setSearchQuery("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (selectedAimag) {
        setShowAimagList(false);
      } else {
        setShowAimagList(true);
      }
    }
  };

  const displayText = selectedDistrict
    ? `${selectedAimag?.name}, ${selectedDistrict.name}`
    : selectedAimag
    ? selectedAimag.name
    : "Бүх хот";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {typeof trigger === "function" ? (
          trigger(displayText)
        ) : trigger ? (
          trigger
        ) : (
          <Button variant="outline" className="min-w-44 justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate max-w-32">{displayText}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Аймаг эсвэл хот</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search - only show when aimag list is visible */}
          {showAimagList && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Аймаг хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Reset button */}
          {(selectedAimag || selectedDistrict) && showAimagList && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="w-full">
              Бүгдийг сонгох
            </Button>
          )}

          {/* Loading state */}
          {isLoadingAimags && showAimagList && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Aimags list */}
          {showAimagList && !isLoadingAimags && (
            <div className="max-h-72 overflow-y-auto space-y-1">
              <p className="text-sm font-medium text-muted-foreground px-2 py-1">
                Аймаг, хотууд
              </p>
              {filteredAimags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Аймаг олдсонгүй
                </p>
              ) : (
                filteredAimags.map((aimag) => (
                  <button
                    key={aimag.id}
                    onClick={() => handleAimagSelect(aimag)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between transition-colors ${
                      selectedAimag?.id === aimag.id ? "bg-accent" : ""
                    }`}
                  >
                    <span>{aimag.name}</span>
                    {selectedAimag?.id === aimag.id ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected aimag header with change button */}
          {selectedAimag && !showAimagList && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{selectedAimag.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleChangeAimag}>
                  Өөрчлөх
                </Button>
              </div>

              {/* Loading districts */}
              {isLoadingDistricts && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Districts list */}
              {!isLoadingDistricts && districts.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  <p className="text-sm font-medium text-muted-foreground px-2 py-1">
                    Дүүрэг / Сум
                  </p>
                  {districts.map((district) => (
                    <button
                      key={district.id}
                      onClick={() => handleDistrictSelect(district)}
                      className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between transition-colors ${
                        selectedDistrict?.id === district.id ? "bg-accent" : ""
                      }`}
                    >
                      <span>{district.name}</span>
                      {selectedDistrict?.id === district.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* No districts message */}
              {!isLoadingDistricts && districts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Дүүрэг/сум олдсонгүй
                </p>
              )}

              {/* Confirm button - select whole aimag */}
              <Button onClick={handleSelectWholeAimag} variant="outline" className="w-full">
                Бүх {selectedAimag.name} сонгох
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
