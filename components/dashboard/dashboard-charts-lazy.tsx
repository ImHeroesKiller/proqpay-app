"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard/dashboard-charts").then((m) => ({
      default: m.DashboardCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-full min-h-[16rem] w-full" aria-label="Loading chart" />
    ),
  },
);

type Point = { month: string; amount: number };

/** Lazy Recharts entry — keeps chart JS off the primary dashboard path. */
export function DashboardChartsLazy({ data }: { data: Point[] }) {
  return <DashboardCharts data={data} />;
}
