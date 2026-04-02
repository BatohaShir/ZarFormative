import type { ListingWithRelations } from "@/components/listing-card";

// Тип для листинга с предвычисленными координатами
export type ListingWithCoords = ListingWithRelations & { lat: number; lng: number };

// Вынесенная функция для вычисления координат - не зависит от Leaflet
export function getListingsWithCoords(listings: ListingWithRelations[]): ListingWithCoords[] {
  return listings
    .filter((listing) => {
      if (listing.service_type === "remote") {
        const lat = listing.latitude ? Number(listing.latitude) : null;
        const lng = listing.longitude ? Number(listing.longitude) : null;
        return lat && lng;
      }
      const lat = listing.district?.latitude || listing.aimag?.latitude;
      const lng = listing.district?.longitude || listing.aimag?.longitude;
      return lat && lng;
    })
    .map((listing) => {
      let lat: number;
      let lng: number;

      if (listing.service_type === "remote") {
        lat = listing.latitude ? Number(listing.latitude) : 0;
        lng = listing.longitude ? Number(listing.longitude) : 0;
      } else {
        lat = listing.district?.latitude || listing.aimag?.latitude || 0;
        lng = listing.district?.longitude || listing.aimag?.longitude || 0;
      }

      return { ...listing, lat, lng };
    });
}
