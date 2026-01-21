"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { Send, Loader2, CheckCircle, MessageSquare } from "lucide-react";
import { useCreatelisting_requests, useFindFirstlisting_requests } from "@/lib/hooks";

interface RequestFormProps {
  listingId: string;
  listingTitle: string;
  providerId: string;
  providerName: string;
}

export function RequestForm({
  listingId,
  listingTitle,
  providerId,
  providerName,
}: RequestFormProps) {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Check if user is the owner of the listing
  const isOwner = user?.id === providerId;

  // Check if user already has an active request for this listing
  const { data: existingRequest, refetch: refetchExisting } = useFindFirstlisting_requests(
    {
      where: {
        listing_id: listingId,
        client_id: user?.id || "",
        status: {
          in: ["pending", "accepted", "in_progress"],
        },
      },
    },
    {
      enabled: !!user?.id && !isOwner,
    }
  );

  // Create request mutation
  const createRequest = useCreatelisting_requests();

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setMessage("");
      setIsSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("Нэвтрэх шаардлагатай");
      return;
    }

    if (!message.trim()) {
      toast.error("Мессеж бичнэ үү");
      return;
    }

    if (message.trim().length < 10) {
      toast.error("Мессеж хамгийн багадаа 10 тэмдэгттэй байх ёстой");
      return;
    }

    try {
      await createRequest.mutateAsync({
        data: {
          listing_id: listingId,
          client_id: user.id,
          provider_id: providerId,
          message: message.trim(),
          status: "pending",
        },
      });

      setIsSuccess(true);
      toast.success("Хүсэлт амжилттай илгээгдлээ!");

      // Refetch to update existing request status
      refetchExisting();

      // Close dialog after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        setIsSuccess(false);
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Хүсэлт илгээхэд алдаа гарлаа");
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setOpen(true);
  };

  // Don't show button if user is owner
  if (isOwner) {
    return null;
  }

  // Show "already sent" state if there's an active request
  if (existingRequest) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Хүсэлт илгээгдсэн</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Та энэ үйлчилгээнд хүсэлт илгээсэн байна. Хариуг хүлээнэ үү.
        </p>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="w-full" size="lg">
            <MessageSquare className="h-5 w-5 mr-2" />
            Хүсэлт илгээх
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Хүсэлт илгээх</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{providerName}</span> руу &quot;{listingTitle}&quot; үйлчилгээний талаар хүсэлт илгээх
            </DialogDescription>
          </DialogHeader>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Хүсэлт илгээгдлээ!</h3>
              <p className="text-sm text-muted-foreground">
                {providerName} таны хүсэлтийг хүлээн авсан бөгөөд удахгүй хариу өгөх болно.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Мессеж
                </label>
                <Textarea
                  id="message"
                  placeholder="Үйлчилгээний талаар дэлгэрэнгүй бичнэ үү. Жишээ нь: хэзээ, хаана, ямар ажил хийлгэх вэ?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  disabled={createRequest.isPending}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/2000
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                  disabled={createRequest.isPending}
                >
                  Болих
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createRequest.isPending || message.trim().length < 10}
                >
                  {createRequest.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Илгээж байна...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Илгээх
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={handleLoginSuccess}
        title="Хүсэлт илгээхийн тулд нэвтэрнэ үү"
        description="Үйлчилгээ үзүүлэгч рүү хүсэлт илгээхийн тулд эхлээд нэвтрэх шаардлагатай."
        icon={MessageSquare}
      />
    </>
  );
}
