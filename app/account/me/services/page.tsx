"use client";

import dynamic from "next/dynamic";

const ServicesClient = dynamic(
  () => import("./_components/services-client").then((mod) => mod.ServicesClient),
  { ssr: false }
);

export default function MyServicesPage() {
  return <ServicesClient />;
}
