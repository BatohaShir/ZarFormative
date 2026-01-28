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
  started_at: Date | null;  // Когда исполнитель начал работу (in_progress)
  completed_at: Date | null;
  // Данные о завершении работы
  completion_description: string | null;
  completion_photos: string[];
  // Адрес оказания услуги (для on_site заявок - координаты клиента)
  aimag_id: string | null;
  district_id: string | null;
  khoroo_id: string | null;
  address_detail: string | null;
  latitude: number | null;
  longitude: number | null;
  // Телефон клиента
  client_phone: string | null;
  aimag: { id: string; name: string; latitude?: number | null; longitude?: number | null } | null;
  district: { id: string; name: string; latitude?: number | null; longitude?: number | null } | null;
  khoroo: { id: string; name: string; latitude?: number | null; longitude?: number | null } | null;
  listing: {
    id: string;
    title: string;
    slug: string;
    service_type: "on_site" | "remote";
    address: string | null;
    price?: string | number | null;
    // Телефон исполнителя
    phone?: string | null;
    // Координаты исполнителя (для remote услуг)
    latitude?: number | null;
    longitude?: number | null;
    images: Array<{
      url: string;
      is_cover: boolean;
    }>;
  };
  client: PersonInfo;
  provider: PersonInfo;
  // Отзыв клиента (после завершения)
  review: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: Date;
  } | null;
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
  // Completion flow actions
  // Step 1: Provider submits report (in_progress -> awaiting_client_confirmation)
  onProviderSubmitDetails: (requestId: string, description: string, photoUrls: string[]) => Promise<void>;
  // Step 2: Client confirms and writes review (awaiting_client_confirmation -> awaiting_payment)
  onClientConfirmCompletion: (requestId: string, rating: number, comment: string) => Promise<void>;
  // Step 3: Payment complete (awaiting_payment -> completed)
  onPaymentComplete: (requestId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}
