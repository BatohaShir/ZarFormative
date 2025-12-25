"use client";

import * as React from "react";
import { MapPin, ChevronRight, ChevronLeft, Check, Search, Home, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Types
interface District {
  id: string;
  name: string;
  khoroos: string[];
}

interface City {
  id: string;
  name: string;
  districts: District[];
}

// Data
const cities: City[] = [
  {
    id: "ulaanbaatar",
    name: "Улаанбаатар",
    districts: [
      {
        id: "bayangol",
        name: "Баянгол",
        khoroos: ["1-р хороо", "2-р хороо", "3-р хороо", "4-р хороо", "5-р хороо", "6-р хороо", "7-р хороо", "8-р хороо", "9-р хороо", "10-р хороо", "11-р хороо", "12-р хороо", "13-р хороо", "14-р хороо", "15-р хороо", "16-р хороо", "17-р хороо", "18-р хороо", "19-р хороо", "20-р хороо", "21-р хороо", "22-р хороо", "23-р хороо"],
      },
      {
        id: "bayanzurkh",
        name: "Баянзүрх",
        khoroos: ["1-р хороо", "2-р хороо", "3-р хороо", "4-р хороо", "5-р хороо", "6-р хороо", "7-р хороо", "8-р хороо", "9-р хороо", "10-р хороо", "11-р хороо", "12-р хороо", "13-р хороо", "14-р хороо", "15-р хороо", "16-р хороо", "17-р хороо", "18-р хороо", "19-р хороо", "20-р хороо", "21-р хороо", "22-р хороо", "23-р хороо", "24-р хороо", "25-р хороо", "26-р хороо", "27-р хороо", "28-р хороо"],
      },
      {
        id: "songinokhairkhan",
        name: "Сонгинохайрхан",
        khoroos: ["1-р хороо", "2-р хороо", "3-р хороо", "4-р хороо", "5-р хороо", "6-р хороо", "7-р хороо", "8-р хороо", "9-р хороо", "10-р хороо", "11-р хороо", "12-р хороо", "13-р хороо", "14-р хороо", "15-р хороо", "16-р хороо", "17-р хороо", "18-р хороо", "19-р хороо", "20-р хороо", "21-р хороо", "22-р хороо", "23-р хороо", "24-р хороо", "25-р хороо", "26-р хороо", "27-р хороо", "28-р хороо", "29-р хороо", "30-р хороо", "31-р хороо", "32-р хороо"],
      },
      {
        id: "sukhbaatar",
        name: "Сүхбаатар",
        khoroos: ["1-р хороо", "2-р хороо", "3-р хороо", "4-р хороо", "5-р хороо", "6-р хороо", "7-р хороо", "8-р хороо", "9-р хороо", "10-р хороо", "11-р хороо", "12-р хороо", "13-р хороо", "14-р хороо", "15-р хороо", "16-р хороо", "17-р хороо", "18-р хороо", "19-р хороо", "20-р хороо"],
      },
      {
        id: "khan-uul",
        name: "Хан-Уул",
        khoroos: ["1-р хороо", "2-р хороо", "3-р хороо", "4-р хороо", "5-р хороо", "6-р хороо", "7-р хороо", "8-р хороо", "9-р хороо", "10-р хороо", "11-р хороо", "12-р хороо", "13-р хороо", "14-р хороо", "15-р хороо", "16-р хороо"],
      },
      {
        id: "chingeltei",
        name: "Чингэлтэй",
        khoroos: ["1-р хороо", "2-р хороо", "3-р хороо", "4-р хороо", "5-р хороо", "6-р хороо", "7-р хороо", "8-р хороо", "9-р хороо", "10-р хороо", "11-р хороо", "12-р хороо", "13-р хороо", "14-р хороо", "15-р хороо", "16-р хороо", "17-р хороо", "18-р хороо", "19-р хороо"],
      },
      {
        id: "baganuur",
        name: "Багануур",
        khoroos: ["1-р хороо", "2-р хороо", "3-р хороо", "4-р хороо", "5-р хороо"],
      },
      {
        id: "bagakhangai",
        name: "Багахангай",
        khoroos: ["1-р хороо", "2-р хороо"],
      },
      {
        id: "nalaikh",
        name: "Налайх",
        khoroos: ["1-р хороо", "2-р хороо", "3-р хороо", "4-р хороо", "5-р хороо", "6-р хороо", "7-р хороо"],
      },
    ],
  },
  {
    id: "darkhan",
    name: "Дархан-Уул",
    districts: [
      {
        id: "darkhan",
        name: "Дархан",
        khoroos: ["1-р баг", "2-р баг", "3-р баг", "4-р баг", "5-р баг", "6-р баг", "7-р баг", "8-р баг", "9-р баг", "10-р баг"],
      },
      {
        id: "khongor",
        name: "Хонгор",
        khoroos: ["1-р баг", "2-р баг", "3-р баг"],
      },
      {
        id: "shariin-gol",
        name: "Шарын гол",
        khoroos: ["1-р баг", "2-р баг", "3-р баг"],
      },
      {
        id: "orkhon",
        name: "Орхон",
        khoroos: ["1-р баг", "2-р баг"],
      },
    ],
  },
  {
    id: "erdenet",
    name: "Орхон",
    districts: [
      {
        id: "bayan-undur",
        name: "Баян-Өндөр",
        khoroos: ["1-р баг", "2-р баг", "3-р баг", "4-р баг", "5-р баг", "6-р баг", "7-р баг", "8-р баг", "9-р баг", "10-р баг", "11-р баг", "12-р баг", "13-р баг", "14-р баг", "15-р баг", "16-р баг", "17-р баг", "18-р баг", "19-р баг", "20-р баг", "21-р баг"],
      },
      {
        id: "jargalant",
        name: "Жаргалант",
        khoroos: ["1-р баг", "2-р баг", "3-р баг", "4-р баг"],
      },
    ],
  },
];

// Common streets in UB
const commonStreets = [
  "Энхтайваны өргөн чөлөө",
  "Чингисийн өргөн чөлөө",
  "Намъяанжугийн гудамж",
  "Олимпийн гудамж",
  "Сөүлийн гудамж",
  "Их тойруу",
  "Бага тойруу",
  "Зүүн 4-р зам",
  "Баруун 4-р зам",
  "Баянбүрд",
  "Жуковын гудамж",
  "Токиогийн гудамж",
  "Сэлбэ",
  "Их Монгол",
  "Нарны зам",
  "Оргил",
  "100 айл",
  "Хороолол",
];

export interface AddressData {
  city: string;
  district: string;
  khoroo: string;
  street: string;
  building: string;
  apartment: string;
}

interface AddressSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (address: AddressData) => void;
  initialAddress?: AddressData;
}

type Step = "city" | "district" | "khoroo" | "details";

export function AddressSelectModal({
  open,
  onOpenChange,
  onSelect,
  initialAddress,
}: AddressSelectModalProps) {
  const [step, setStep] = React.useState<Step>("city");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [selectedCity, setSelectedCity] = React.useState<City | null>(null);
  const [selectedDistrict, setSelectedDistrict] = React.useState<District | null>(null);
  const [selectedKhoroo, setSelectedKhoroo] = React.useState<string>("");
  const [street, setStreet] = React.useState("");
  const [building, setBuilding] = React.useState("");
  const [apartment, setApartment] = React.useState("");
  const [streetSuggestions, setStreetSuggestions] = React.useState<string[]>([]);
  const [showStreetSuggestions, setShowStreetSuggestions] = React.useState(false);

  // Initialize from initial address
  React.useEffect(() => {
    if (initialAddress && open) {
      const city = cities.find(c => c.name === initialAddress.city);
      if (city) {
        setSelectedCity(city);
        const district = city.districts.find(d => d.name === initialAddress.district);
        if (district) {
          setSelectedDistrict(district);
          setSelectedKhoroo(initialAddress.khoroo || "");
        }
      }
      setStreet(initialAddress.street || "");
      setBuilding(initialAddress.building || "");
      setApartment(initialAddress.apartment || "");
      if (initialAddress.city && initialAddress.district && initialAddress.khoroo) {
        setStep("details");
      } else if (initialAddress.city && initialAddress.district) {
        setStep("khoroo");
      } else if (initialAddress.city) {
        setStep("district");
      }
    }
  }, [initialAddress, open]);

  // Reset on close
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("city");
      setSelectedCity(null);
      setSelectedDistrict(null);
      setSelectedKhoroo("");
      setStreet("");
      setBuilding("");
      setApartment("");
      setSearchQuery("");
    }, 300);
  };

  // Filter cities
  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter districts
  const filteredDistricts = selectedCity?.districts.filter(district =>
    district.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filter khoroos
  const filteredKhoroos = selectedDistrict?.khoroos.filter(khoroo =>
    khoroo.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle city select
  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setSelectedDistrict(null);
    setSelectedKhoroo("");
    setSearchQuery("");
    setStep("district");
  };

  // Handle district select
  const handleDistrictSelect = (district: District) => {
    setSelectedDistrict(district);
    setSelectedKhoroo("");
    setSearchQuery("");
    setStep("khoroo");
  };

  // Handle khoroo select
  const handleKhorooSelect = (khoroo: string) => {
    setSelectedKhoroo(khoroo);
    setSearchQuery("");
    setStep("details");
  };

  // Handle street input
  const handleStreetChange = (value: string) => {
    setStreet(value);
    if (value.length > 0) {
      const suggestions = commonStreets.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setStreetSuggestions(suggestions);
      setShowStreetSuggestions(suggestions.length > 0);
    } else {
      setShowStreetSuggestions(false);
    }
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
    } else if (step === "details") {
      setStep("khoroo");
      setSelectedKhoroo("");
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    if (!selectedCity || !selectedDistrict || !selectedKhoroo) return;

    onSelect({
      city: selectedCity.name,
      district: selectedDistrict.name,
      khoroo: selectedKhoroo,
      street: street,
      building: building,
      apartment: apartment,
    });
    handleClose();
  };

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case "city": return "Хот/Аймаг сонгох";
      case "district": return "Дүүрэг/Сум сонгох";
      case "khoroo": return "Хороо/Баг сонгох";
      case "details": return "Дэлгэрэнгүй хаяг";
    }
  };

  // Get breadcrumb
  const getBreadcrumb = () => {
    const parts = [];
    if (selectedCity) parts.push(selectedCity.name);
    if (selectedDistrict) parts.push(selectedDistrict.name);
    if (selectedKhoroo) parts.push(selectedKhoroo);
    return parts.join(" → ");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-2">
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
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* City selection */}
          {step === "city" && (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Хот хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleCitySelect(city)}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium">{city.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* District selection */}
          {step === "district" && (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Дүүрэг хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredDistricts.map((district) => (
                  <button
                    key={district.id}
                    onClick={() => handleDistrictSelect(district)}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent flex items-center justify-between transition-colors"
                  >
                    <span>{district.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Khoroo selection */}
          {step === "khoroo" && (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Хороо хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-1.5">
                  {filteredKhoroos.map((khoroo) => (
                    <button
                      key={khoroo}
                      onClick={() => handleKhorooSelect(khoroo)}
                      className="px-2 py-2 rounded-md hover:bg-accent text-sm transition-colors border"
                    >
                      {khoroo}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Address details */}
          {step === "details" && (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {/* Street */}
              <div className="space-y-1.5 relative">
                <label className="text-sm font-medium">Гудамж / Хотхон</label>
                <Input
                  placeholder="Жишээ: Энхтайваны өргөн чөлөө"
                  value={street}
                  onChange={(e) => handleStreetChange(e.target.value)}
                  onFocus={() => street.length > 0 && setShowStreetSuggestions(streetSuggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowStreetSuggestions(false), 200)}
                />
                {showStreetSuggestions && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-32 overflow-y-auto">
                    {streetSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        onMouseDown={() => {
                          setStreet(suggestion);
                          setShowStreetSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Building */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Байр / Гэр
                </label>
                <Input
                  placeholder="Жишээ: 45-р байр эсвэл 123-р тоот"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                />
              </div>

              {/* Apartment */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Орц / Тоот
                </label>
                <Input
                  placeholder="Жишээ: 2 орц, 34 тоот"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                />
              </div>

              {/* Summary */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Таны хаяг:</p>
                <p className="text-sm">
                  {selectedCity?.name}, {selectedDistrict?.name}, {selectedKhoroo}
                  {street && `, ${street}`}
                  {building && `, ${building}`}
                  {apartment && `, ${apartment}`}
                </p>
              </div>

              {/* Confirm button */}
              <Button className="w-full" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" />
                Хаяг баталгаажуулах
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
