"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { allCategories, type Category } from "@/lib/categories";

interface CategoriesModalProps {
  onSelectCategory?: (category: Category) => void;
  onSelectSubcategory?: (category: Category, subcategory: string) => void;
  trigger?: React.ReactNode;
}

const isImageIcon = (icon: string) => icon.startsWith("/");

export function CategoriesModal({ onSelectCategory, onSelectSubcategory, trigger }: CategoriesModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);

  const filteredCategories = allCategories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.subcategories?.some((sub) =>
        sub.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleSelectSubcategory = (subcategory: string) => {
    if (selectedCategory) {
      if (onSelectSubcategory) {
        onSelectSubcategory(selectedCategory, subcategory);
      } else {
        router.push(`/services?categories=${encodeURIComponent(subcategory)}`);
      }
      setOpen(false);
      setSelectedCategory(null);
    }
  };

  const handleSelectWholeCategory = () => {
    if (selectedCategory) {
      if (onSelectCategory) {
        onSelectCategory(selectedCategory);
      } else {
        router.push(`/services?categories=${encodeURIComponent(selectedCategory.name)}`);
      }
      setOpen(false);
      setSelectedCategory(null);
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedCategory(null);
      setSearchQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Бүх ангилал</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedCategory && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedCategory ? selectedCategory.name : "Бүх ангилал"}
          </DialogTitle>
        </DialogHeader>

        {!selectedCategory ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ангилал хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-2">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleSelectCategory(category)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  {isImageIcon(category.icon) ? (
                    <Image src={category.icon} alt={category.name} width={32} height={32} />
                  ) : (
                    <span className="text-2xl">{category.icon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{category.name}</p>
                    {category.subcategories && (
                      <p className="text-xs text-muted-foreground truncate">
                        {category.subcategories.slice(0, 2).join(", ")}...
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {isImageIcon(selectedCategory.icon) ? (
                <Image src={selectedCategory.icon} alt={selectedCategory.name} width={40} height={40} />
              ) : (
                <span className="text-3xl">{selectedCategory.icon}</span>
              )}
              <div>
                <p className="font-medium">{selectedCategory.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCategory.subcategories?.length || 0} дэд ангилал
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-2">
              {selectedCategory.subcategories?.map((sub, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSubcategory(sub)}
                  className="p-3 rounded-lg hover:bg-accent transition-colors text-left text-sm"
                >
                  {sub}
                </button>
              ))}
            </div>

            <Button variant="outline" className="w-full" onClick={handleSelectWholeCategory}>
              Бүх {selectedCategory.name} харах
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
