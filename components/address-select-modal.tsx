"use client";

import * as React from "react";
import { MapPin, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFindManyaimags } from "@/lib/hooks/aimags";
import { useFindManydistricts } from "@/lib/hooks/districts";
import { useFindManykhoroos } from "@/lib/hooks/khoroos";
import { CACHE_TIMES } from "@/lib/react-query-config";
import type { AimagType, DistrictType } from "@prisma/client";
import { cn } from "@/lib/utils";

// Типы для оптимизированных select запросов
type AimagSelect = {
  id: string;
  name: string;
  code: string;
  type: AimagType;
  sort_order: number;
};

type DistrictSelect = {
  id: string;
  name: string;
  aimag_id: string;
  type: DistrictType;
  sort_order: number;
};

type KhorooSelect = {
  id: string;
  name: string;
  district_id: string;
  number: number | null;
  sort_order: number;
};

export interface AddressData {
  city: string;
  cityId: string;
  district: string;
  districtId: string;
  khoroo: string;
  khorooId: string;
}

interface AddressSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (address: AddressData) => void;
  initialAddress?: AddressData;
  /** Если true - выбор останавливается на дюйме/суме (без хороо) */
  hideKhoroo?: boolean;
}

type Step = "city" | "district" | "khoroo";

export function AddressSelectModal({
  open,
  onOpenChange,
  onSelect,
  initialAddress,
  hideKhoroo = false,
}: AddressSelectModalProps) {
  const [step, setStep] = React.useState<Step>("city");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [selectedCity, setSelectedCity] = React.useState<AimagSelect | null>(null);
  const [selectedDistrict, setSelectedDistrict] = React.useState<DistrictSelect | null>(null);

  // Fetch aimags from DB - справочники кэшируем надолго
  const { data: aimagsData, isLoading: isLoadingAimags } = useFindManyaimags(
    {
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true, code: true, type: true, sort_order: true },
    },
    { ...CACHE_TIMES.LOCATIONS }
  );

  // Fetch districts when aimag selected
  const { data: districtsData, isLoading: isLoadingDistricts } = useFindManydistricts(
    selectedCity ? {
      where: {
        aimag_id: selectedCity.id,
        is_active: true
      },
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true, aimag_id: true, type: true, sort_order: true },
    } : undefined,
    { enabled: !!selectedCity, ...CACHE_TIMES.LOCATIONS }
  );

  // Fetch khoroos when district selected
  const { data: khoroosData, isLoading: isLoadingKhoroos } = useFindManykhoroos(
    selectedDistrict ? {
      where: {
        district_id: selectedDistrict.id,
        is_active: true
      },
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true, district_id: true, number: true, sort_order: true },
    } : undefined,
    { enabled: !!selectedDistrict, ...CACHE_TIMES.LOCATIONS }
  );

  // Initialize from initial address
  React.useEffect(() => {
    if (initialAddress && open && aimagsData && !selectedCity) {
      const city = aimagsData.find(c => c.name === initialAddress.city || c.id === initialAddress.cityId);
      if (city) {
        setSelectedCity(city);
        setStep("district");
      }
    }
  }, [initialAddress, open, aimagsData, selectedCity]);

  // Set district from initial when districts loaded
  // Если hideKhoroo=true, останавливаемся на шаге district (не переходим к khoroo)
  React.useEffect(() => {
    if (initialAddress && districtsData && selectedCity && !selectedDistrict) {
      const district = districtsData.find(d => d.name === initialAddress.district || d.id === initialAddress.districtId);
      if (district) {
        setSelectedDistrict(district);
        // Если hideKhoroo - остаёмся на district, иначе переходим к khoroo
        if (!hideKhoroo) {
          setStep("khoroo");
        }
      }
    }
  }, [initialAddress, districtsData, selectedCity, selectedDistrict, hideKhoroo]);

  // Reset on close
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("city");
      setSelectedCity(null);
      setSelectedDistrict(null);
      setSearchQuery("");
    }, 300);
  };

  // Filter aimags
  const filteredAimags = aimagsData?.filter(aimag =>
    aimag.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filter districts
  const filteredDistricts = districtsData?.filter(district =>
    district.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filter khoroos
  const filteredKhoroos = khoroosData?.filter(khoroo =>
    khoroo.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle city select
  const handleCitySelect = (city: AimagSelect) => {
    setSelectedCity(city);
    setSelectedDistrict(null);
    setSearchQuery("");
    setStep("district");
  };

  // Handle district select
  const handleDistrictSelect = (district: DistrictSelect) => {
    setSelectedDistrict(district);
    setSearchQuery("");

    // Если hideKhoroo - завершаем выбор на уровне дюйма
    if (hideKhoroo && selectedCity) {
      onSelect({
        city: selectedCity.name,
        cityId: selectedCity.id,
        district: district.name,
        districtId: district.id,
        khoroo: "",
        khorooId: "",
      });
      handleClose();
      return;
    }

    setStep("khoroo");
  };

  // Handle khoroo select - завершает выбор
  const handleKhorooSelect = (khoroo: KhorooSelect) => {
    if (!selectedCity || !selectedDistrict) return;

    onSelect({
      city: selectedCity.name,
      cityId: selectedCity.id,
      district: selectedDistrict.name,
      districtId: selectedDistrict.id,
      khoroo: khoroo.name,
      khorooId: khoroo.id,
    });
    handleClose();
  };

  // Handle back
  const handleBack = () => {
    setSearchQuery("");
    if (step === "district") {
      setStep("city");
      setSelectedCity(null);
    } else if (step === "khoroo") {
      setStep("district");
      setSelectedDistrict(null);
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case "city": return "Хот/Аймаг сонгох";
      case "district": return "Дүүрэг/Сум сонгох";
      case "khoroo": return "Хороо/Баг сонгох";
    }
  };

  // Get breadcrumb
  const getBreadcrumb = () => {
    const parts = [];
    if (selectedCity) parts.push(selectedCity.name);
    if (selectedDistrict) parts.push(selectedDistrict.name);
    return parts.join(" → ");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0 space-y-3">
          <div className="flex items-center gap-2">
            {step !== "city" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-lg">{getStepTitle()}</DialogTitle>
          </div>
          {getBreadcrumb() && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {getBreadcrumb()}
            </p>
          )}

          {/* Search */}
          <div className="relative">
            <Input
              placeholder={step === "city" ? "Хот хайх..." : step === "district" ? "Дүүрэг хайх..." : "Хороо хайх..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-3"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 pt-3">
          {/* City/Aimag selection */}
          {step === "city" && (
            <div className="flex-1 overflow-y-auto space-y-1">
              {isLoadingAimags ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAimags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Хот олдсонгүй</p>
                </div>
              ) : (
                filteredAimags.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleCitySelect(city)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent flex items-center justify-between transition-colors",
                      initialAddress?.cityId === city.id && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <span className="font-medium">{city.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* District selection */}
          {step === "district" && (
            <div className="flex-1 overflow-y-auto space-y-1">
              {isLoadingDistricts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDistricts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Дүүрэг олдсонгүй</p>
                </div>
              ) : (
                filteredDistricts.map((district) => (
                  <button
                    key={district.id}
                    onClick={() => handleDistrictSelect(district)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent flex items-center justify-between transition-colors",
                      initialAddress?.districtId === district.id && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <span>{district.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Khoroo selection */}
          {step === "khoroo" && (
            <div className="flex-1 overflow-y-auto">
              {isLoadingKhoroos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredKhoroos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Хороо олдсонгүй</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {filteredKhoroos.map((khoroo) => (
                    <button
                      key={khoroo.id}
                      onClick={() => handleKhorooSelect(khoroo)}
                      className={cn(
                        "px-2 py-2 rounded-lg hover:bg-accent text-sm transition-colors border",
                        initialAddress?.khorooId === khoroo.id && "bg-primary/10 border-primary"
                      )}
                    >
                      {khoroo.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
