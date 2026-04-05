"use client";

import dynamic from "next/dynamic";

const StatsClient = dynamic(
  () => import("./_components/stats-client").then((mod) => mod.StatsClient),
  { ssr: false }
);

export default function StatsPage() {
  return <StatsClient />;
}
