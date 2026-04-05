"use client";

import dynamic from "next/dynamic";

const FavoritesClient = dynamic(
  () => import("./_components/favorites-client").then((mod) => mod.FavoritesClient),
  { ssr: false }
);

export default function FavoritesPage() {
  return <FavoritesClient />;
}
