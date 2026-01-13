"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { profile, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    first_name: "",
    last_name: "",
    phone_number: "",
  });

  React.useEffect(() => {
    if (profile && open) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone_number: profile.phone_number || "",
      });
    }
  }, [profile, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await updateProfile({
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      phone_number: formData.phone_number || null,
    });

    setIsLoading(false);

    if (!error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Хувийн мэдээлэл засах</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Нэр</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              placeholder="Нэрээ оруулна уу"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Овог</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              placeholder="Овгоо оруулна уу"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Утас</Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) =>
                setFormData({ ...formData, phone_number: e.target.value })
              }
              placeholder="Утасны дугаараа оруулна уу"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Болих
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
