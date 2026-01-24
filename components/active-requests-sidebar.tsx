"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Play, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActiveRequest {
  id: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    images: Array<{ url: string; is_cover: boolean }>;
  };
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    is_company: boolean;
    avatar_url: string | null;
  };
  preferred_date: Date | null;
  preferred_time: string | null;
  status: string;
}

interface ActiveRequestsSidebarProps {
  requests: ActiveRequest[];
  onSelectRequest: (request: ActiveRequest) => void;
}

function getClientName(client: ActiveRequest["client"]): string {
  if (client.is_company && client.company_name) {
    return client.company_name;
  }
  const parts = [client.first_name, client.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Хэрэглэгч";
}

function getListingImage(listing: ActiveRequest["listing"]): string {
  const coverImage = listing.images?.find((img) => img.is_cover);
  return coverImage?.url || listing.images?.[0]?.url || "/placeholder-service.jpg";
}

function formatDateTime(date: Date | null, time: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("mn-MN", {
    month: "short",
    day: "numeric",
  });
  if (time) {
    return `${dateStr}, ${time}`;
  }
  return dateStr;
}

export const ActiveRequestsSidebar = React.memo(function ActiveRequestsSidebar({
  requests,
  onSelectRequest,
}: ActiveRequestsSidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Фильтруем только accepted и in_progress заявки
  const activeRequests = requests.filter(
    (r) => r.status === "accepted" || r.status === "in_progress"
  );

  // Listen for custom event to open sidebar (from mobile nav)
  React.useEffect(() => {
    const handleOpenSidebar = () => setIsOpen(true);
    window.addEventListener("open-active-requests-sidebar", handleOpenSidebar);
    return () => window.removeEventListener("open-active-requests-sidebar", handleOpenSidebar);
  }, []);

  if (activeRequests.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop Toggle button - right side, vertically centered */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-40 bg-primary text-primary-foreground rounded-l-lg flex-col items-center justify-center gap-2 hover:bg-primary/90 transition-all duration-300 shadow-lg",
          isOpen && "translate-x-full opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="text-[10px] font-medium" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          Ажилд
        </span>
        <span className="w-5 h-5 bg-white text-primary rounded-full text-xs font-bold flex items-center justify-center">
          {activeRequests.length}
        </span>
      </button>

      {/* Desktop sidebar panel - right side (below navbar) */}
      <div
        className={cn(
          "hidden md:flex fixed top-[65px] bottom-0 right-0 z-30 w-1/2 max-w-xl min-w-80 bg-background border-l shadow-2xl transition-transform duration-300 ease-in-out flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-500" />
              Ажилд байгаа захиалга
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeRequests.length} захиалга
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Requests list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => onSelectRequest(request)}
              className="p-3 rounded-xl border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <div className="flex gap-3">
                {/* Service image */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={getListingImage(request.listing)}
                    alt={request.listing.title}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {request.listing.title}
                  </p>

                  {/* Client */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="relative w-5 h-5 rounded-full overflow-hidden bg-muted shrink-0">
                      {request.client.avatar_url ? (
                        <Image
                          src={request.client.avatar_url}
                          alt=""
                          fill
                          unoptimized={request.client.avatar_url.includes("dicebear")}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {getClientName(request.client)}
                    </span>
                  </div>

                  {/* Date/Time */}
                  {formatDateTime(request.preferred_date, request.preferred_time) && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(request.preferred_date, request.preferred_time)}
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  {request.status === "in_progress" ? (
                    <>
                      <span className="w-3 h-3 bg-blue-500 rounded-full block animate-pulse" />
                      <span className="text-[10px] text-blue-500 font-medium">Ажилд</span>
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 bg-green-500 rounded-full block" />
                      <span className="text-[10px] text-green-600 font-medium">Хүлээсэн</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile bottom sheet panel */}
      <div
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40 bg-background border-t rounded-t-xl shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: "70vh" }}
      >
        {/* Header */}
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-500" />
              Ажилд байгаа захиалга
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeRequests.length} захиалга
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Requests list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => onSelectRequest(request)}
              className="p-3 rounded-xl border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-colors"
            >
              <div className="flex gap-3">
                {/* Service image */}
                <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={getListingImage(request.listing)}
                    alt={request.listing.title}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {request.listing.title}
                  </p>

                  {/* Client */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="relative w-4 h-4 rounded-full overflow-hidden bg-muted shrink-0">
                      {request.client.avatar_url ? (
                        <Image
                          src={request.client.avatar_url}
                          alt=""
                          fill
                          unoptimized={request.client.avatar_url.includes("dicebear")}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {getClientName(request.client)}
                    </span>
                  </div>

                  {/* Date/Time */}
                  {formatDateTime(request.preferred_date, request.preferred_time) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-primary font-medium">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(request.preferred_date, request.preferred_time)}
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  {request.status === "in_progress" ? (
                    <>
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full block animate-pulse" />
                      <span className="text-[9px] text-blue-500 font-medium">Ажилд</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full block" />
                      <span className="text-[9px] text-green-600 font-medium">Хүлээсэн</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});
