"use client";

import * as React from "react";
import { MapPin, ChevronDown, Search, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface District {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  districts: District[];
}

const cities: City[] = [
  {
    id: "ulaanbaatar",
    name: "Улаанбаатар",
    districts: [
      { id: "bayangol", name: "Баянгол" },
      { id: "bayanzurkh", name: "Баянзүрх" },
      { id: "songinokhairkhan", name: "Сонгинохайрхан" },
      { id: "sukhbaatar", name: "Сүхбаатар" },
      { id: "khan-uul", name: "Хан-Уул" },
      { id: "chingeltei", name: "Чингэлтэй" },
      { id: "baganuur", name: "Багануур" },
      { id: "bagakhangai", name: "Багахангай" },
      { id: "nalaikh", name: "Налайх" },
    ],
  },
  {
    id: "darkhan",
    name: "Дархан",
    districts: [
      { id: "darkhan", name: "Дархан" },
      { id: "khongor", name: "Хонгор" },
      { id: "shariin-gol", name: "Шарын гол" },
      { id: "orkhon", name: "Орхон" },
    ],
  },
  {
    id: "erdenet",
    name: "Эрдэнэт",
    districts: [
      { id: "bayan-undur", name: "Баян-Өндөр" },
      { id: "jargalant", name: "Жаргалант" },
    ],
  },
  {
    id: "choibalsan",
    name: "Чойбалсан",
    districts: [
      { id: "kherlen", name: "Хэрлэн" },
      { id: "choibalsan-city", name: "Чойбалсан хот" },
    ],
  },
  {
    id: "murun",
    name: "Мөрөн",
    districts: [
      { id: "murun-city", name: "Мөрөн хот" },
      { id: "alag-erdene", name: "Алаг-Эрдэнэ" },
    ],
  },
  {
    id: "khovd",
    name: "Ховд",
    districts: [
      { id: "jargalant-khovd", name: "Жаргалант" },
      { id: "buyant", name: "Буянт" },
    ],
  },
  {
    id: "ulgii",
    name: "Өлгий",
    districts: [
      { id: "ulgii-city", name: "Өлгий хот" },
      { id: "altai", name: "Алтай" },
    ],
  },
  {
    id: "bayankhongor",
    name: "Баянхонгор",
    districts: [
      { id: "bayankhongor-city", name: "Баянхонгор хот" },
      { id: "erdenetsogt", name: "Эрдэнэцогт" },
    ],
  },
  {
    id: "arvaikheer",
    name: "Арвайхээр",
    districts: [
      { id: "arvaikheer-city", name: "Арвайхээр хот" },
      { id: "kharkhorin", name: "Хархорин" },
    ],
  },
  {
    id: "dalanzadgad",
    name: "Даланзадгад",
    districts: [
      { id: "dalanzadgad-city", name: "Даланзадгад хот" },
      { id: "khanbogd", name: "Ханбогд" },
    ],
  },
  {
    id: "sukhbaatar-city",
    name: "Сүхбаатар",
    districts: [
      { id: "sukhbaatar-center", name: "Сүхбаатар төв" },
      { id: "altanbulag", name: "Алтанбулаг" },
    ],
  },
  {
    id: "zuunmod",
    name: "Зуунмод",
    districts: [
      { id: "zuunmod-city", name: "Зуунмод хот" },
      { id: "sergelen", name: "Сэргэлэн" },
    ],
  },
];

interface CitySelectProps {
  trigger?: React.ReactNode | ((displayText: string) => React.ReactNode);
  onSelect?: (city: string, district: string) => void;
  value?: { city: string; district: string };
}

const STORAGE_KEY = "uilchilgee_selected_city";

function getStoredCity(): { cityName: string; districtName: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeCity(cityName: string, districtName: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cityName, districtName }));
  } catch {
    // Ignore storage errors
  }
}

function clearStoredCity() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function CitySelect({ trigger, onSelect, value }: CitySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [selectedCity, setSelectedCity] = React.useState<City | null>(null);
  const [selectedDistrict, setSelectedDistrict] = React.useState<District | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showCityList, setShowCityList] = React.useState(true);

  // Initialize from localStorage on mount
  React.useEffect(() => {
    const stored = getStoredCity();
    if (value?.city) {
      const city = cities.find((c) => c.name === value.city) || null;
      setSelectedCity(city);
      if (value.district && city) {
        setSelectedDistrict(city.districts.find((d) => d.name === value.district) || null);
      }
    } else if (stored) {
      const city = cities.find((c) => c.name === stored.cityName) || null;
      setSelectedCity(city);
      if (stored.districtName && city) {
        setSelectedDistrict(city.districts.find((d) => d.name === stored.districtName) || null);
      }
    }
    setIsInitialized(true);
  }, [value]);

  const filteredCities = cities.filter((city) =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setSelectedDistrict(null);
    setShowCityList(false);
  };

  const handleDistrictSelect = (district: District) => {
    setSelectedDistrict(district);
    storeCity(selectedCity?.name || "", district.name);
    onSelect?.(selectedCity?.name || "", district.name);
    setOpen(false);
  };

  const handleSelectWholeCity = () => {
    if (selectedCity) {
      storeCity(selectedCity.name, "");
      onSelect?.(selectedCity.name, "");
      setOpen(false);
    }
  };

  const handleReset = () => {
    setSelectedCity(null);
    setSelectedDistrict(null);
    setSearchQuery("");
    setShowCityList(true);
    clearStoredCity();
  };

  const handleChangeCity = () => {
    setShowCityList(true);
    setSearchQuery("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (selectedCity) {
        setShowCityList(false);
      } else {
        setShowCityList(true);
      }
    }
  };

  const displayText = selectedDistrict
    ? `${selectedCity?.name}, ${selectedDistrict.name}`
    : selectedCity
    ? selectedCity.name
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
          <DialogTitle>Хот эсвэл бүс нутаг</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search - only show when city list is visible */}
          {showCityList && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Хот хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Reset button */}
          {(selectedCity || selectedDistrict) && showCityList && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="w-full">
              Бүх хот сонгох
            </Button>
          )}

          {/* Cities list */}
          {showCityList && (
            <div className="max-h-72 overflow-y-auto space-y-1">
              <p className="text-sm font-medium text-muted-foreground px-2 py-1">Хотууд</p>
              {filteredCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between transition-colors ${
                    selectedCity?.id === city.id ? "bg-accent" : ""
                  }`}
                >
                  <span>{city.name}</span>
                  {selectedCity?.id === city.id ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected city header with change button */}
          {selectedCity && !showCityList && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{selectedCity.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleChangeCity}>
                  Өөрчлөх
                </Button>
              </div>

              {/* Districts list */}
              {selectedCity.districts.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  <p className="text-sm font-medium text-muted-foreground px-2 py-1">
                    Дүүргүүд
                  </p>
                  {selectedCity.districts.map((district) => (
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

              {/* Confirm button - select whole city */}
              <Button onClick={handleSelectWholeCity} variant="outline" className="w-full">
                Бүх {selectedCity.name} сонгох
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
