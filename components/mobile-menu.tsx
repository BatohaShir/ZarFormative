"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";

export function MobileMenu() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Меню</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-auto">
        <SheetHeader>
          <SheetTitle className="text-center">
            <span className="text-[#c4272f]">Uilc</span>
            <span className="text-[#015197]">hilge</span>
            <span className="text-[#c4272f]">e.mn</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 mt-4 pb-2">
          <AuthModal />
        </div>
      </SheetContent>
    </Sheet>
  );
}
