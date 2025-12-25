"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Send, CheckCircle, ChevronRight, X } from "lucide-react";
import { AddressSelectModal, AddressData } from "@/components/address-select-modal";

interface ServiceRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: {
    name: string;
    avatar: string;
  };
  serviceTitle: string;
  onRequestSent?: () => void;
}

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

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
    onRequestSent?.();
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after closing
    setTimeout(() => {
      setMessage("");
      setAddress(null);
      setIsSubmitted(false);
    }, 300);
  };

  const handleAddressSelect = (selectedAddress: AddressData) => {
    setAddress(selectedAddress);
  };

  const handleClearAddress = () => {
    setAddress(null);
  };

  const formatAddress = (addr: AddressData): string => {
    const parts = [addr.city, addr.district, addr.khoroo];
    if (addr.street) parts.push(addr.street);
    if (addr.building) parts.push(addr.building);
    if (addr.apartment) parts.push(addr.apartment);
    return parts.join(", ");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Үйлчилгээ авах хүсэлт</DialogTitle>
          </DialogHeader>

          {isSubmitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Хүсэлт илгээгдлээ!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {provider.name} танд удахгүй хариу өгөх болно
                </p>
              </div>
              <Button onClick={handleClose} className="mt-4">
                Хаах
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Provider Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-sm">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{serviceTitle}</p>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Хүсэлтийн дэлгэрэнгүй <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Юу хийлгэхийг хүсч байна вэ? Дэлгэрэнгүй бичнэ үү..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Хаяг (заавал биш)
                </label>
                {address ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
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
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-dashed hover:bg-muted/50 transition-colors text-left"
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
                className="w-full"
                onClick={handleSubmit}
                disabled={!message.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  "Илгээж байна..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Хүсэлт илгээх
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Үйлчилгээ үзүүлэгч таны хүсэлтийг хүлээн авч холбогдох болно
              </p>
            </div>
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
