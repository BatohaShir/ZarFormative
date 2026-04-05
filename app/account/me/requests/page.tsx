"use client";

import dynamic from "next/dynamic";

const RequestsClient = dynamic(
  () => import("./_components/requests-client").then((mod) => mod.RequestsClient),
  { ssr: false }
);

export default function RequestsPage() {
  return <RequestsClient />;
}
