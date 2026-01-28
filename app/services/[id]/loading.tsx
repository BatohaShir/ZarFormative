import { ServiceDetailSkeleton } from "@/components/service-detail-client";

/**
 * Loading skeleton для страницы детали услуги
 * Используется Next.js для instant loading state
 */
export default function ServiceDetailLoading() {
  return <ServiceDetailSkeleton />;
}
