"use client";

import dynamic from "next/dynamic";

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard/dashboard-charts").then(
      (m) => m.DashboardCharts,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-2xl bg-muted/60" />
    ),
  },
);

export function ChartsLazy({
  data,
}: {
  data: { month: string; amount: number }[];
}) {
  return <DashboardCharts data={data} />;
}
