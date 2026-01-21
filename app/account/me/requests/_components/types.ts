import type { RequestStatus } from "@prisma/client";

// Тип для заявки из БД
export interface RequestWithRelations {
  id: string;
  listing_id: string;
  client_id: string;
  provider_id: string;
  message: string;
  status: RequestStatus;
  provider_response: string | null;
  image_url: string | null;
  preferred_date: Date | null;
  preferred_time: string | null;
  created_at: Date;
  updated_at: Date;
  accepted_at: Date | null;
  completed_at: Date | null;
  // Адрес оказания услуги
  aimag_id: string | null;
  district_id: string | null;
  khoroo_id: string | null;
  address_detail: string | null;
  aimag: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  khoroo: { id: string; name: string } | null;
  listing: {
    id: string;
    title: string;
    slug: string;
    images: Array<{
      url: string;
      is_cover: boolean;
    }>;
  };
  client: PersonInfo;
  provider: PersonInfo;
}

export interface PersonInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  is_company: boolean;
  avatar_url: string | null;
}

// Actions interface для handlers
export interface RequestActions {
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onCancelByClient: (requestId: string) => void;
  onCancelByProvider: (requestId: string) => void;
  onStartWork: (requestId: string) => void;
  onComplete: (requestId: string) => void;
  onDelete: (requestId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}
