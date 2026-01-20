"use client";

import * as React from "react";
import { ChevronRight, ChevronLeft, Check, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Types
export interface CategoryData {
  id: string;
  name: string;
  parentId?: string | null;
  parentName?: string;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  children?: Category[];
}

interface CategorySelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (category: CategoryData) => void;
  categories: Category[];
  initialCategory?: CategoryData;
}

type Step = "parent" | "child";

export function CategorySelectModal({
  open,
  onOpenChange,
  onSelect,
  categories,
  initialCategory,
}: CategorySelectModalProps) {
  const [step, setStep] = React.useState<Step>("parent");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedParent, setSelectedParent] = React.useState<Category | null>(null);

  // Get parent categories
  const parentCategories = React.useMemo(() => {
    return categories.filter((cat) => !cat.parent_id);
  }, [categories]);

  // Initialize from initial category
  React.useEffect(() => {
    if (initialCategory && open) {
      if (initialCategory.parentId) {
        const parent = categories.find(c => c.id === initialCategory.parentId);
        if (parent) {
          setSelectedParent(parent);
          setStep("child");
        }
      }
    }
  }, [initialCategory, open, categories]);

  // Reset on close
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("parent");
      setSelectedParent(null);
      setSearchQuery("");
    }, 300);
  };

  // Filter parent categories
  const filteredParents = parentCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter children
  const filteredChildren = selectedParent?.children?.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle parent select
  const handleParentSelect = (parent: Category) => {
    setSelectedParent(parent);
    setSearchQuery("");
    if (parent.children && parent.children.length > 0) {
      setStep("child");
    } else {
      // If no children, select the parent itself
      onSelect({
        id: parent.id,
        name: parent.name,
        parentId: null,
        parentName: undefined,
      });
      handleClose();
    }
  };

  // Handle child select
  const handleChildSelect = (child: Category) => {
    onSelect({
      id: child.id,
      name: child.name,
      parentId: selectedParent?.id,
      parentName: selectedParent?.name,
    });
    handleClose();
  };

  // Handle back
  const handleBack = () => {
    setSearchQuery("");
    setStep("parent");
    setSelectedParent(null);
  };

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case "parent": return "Бүх ангилал";
      case "child": return selectedParent?.name || "Дэд ангилал";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0 space-y-3">
          <div className="flex items-center gap-2">
            {step !== "parent" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-lg">{getStepTitle()}</DialogTitle>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ангилал хайх..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 pt-3">
          {/* Parent categories - Grid view */}
          {step === "parent" && (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {filteredParents.map((parent) => (
                  <button
                    key={parent.id}
                    onClick={() => handleParentSelect(parent)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border hover:border-primary/30 hover:bg-accent/50 transition-all text-left group",
                      initialCategory?.parentId === parent.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{parent.name}</p>
                      {parent.children && parent.children.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {parent.children.slice(0, 2).map(c => c.name).join(", ")}
                          {parent.children.length > 2 && "..."}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
              {filteredParents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ангилал олдсонгүй</p>
                </div>
              )}
            </div>
          )}

          {/* Child categories - List view */}
          {step === "child" && (
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredChildren.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleChildSelect(child)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg hover:bg-accent flex items-center justify-between transition-colors",
                    initialCategory?.id === child.id && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary/40" />
                    <span className="font-medium">{child.name}</span>
                  </span>
                  {initialCategory?.id === child.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
              {filteredChildren.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Дэд ангилал олдсонгүй</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
