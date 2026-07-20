export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { requireModule } from "@/lib/auth/session";
import { measure } from "@/lib/perf";
import {
  getExecutiveDashboardData,
  getExecutiveFilterOptions,
} from "@/lib/data/executive-dashboard";
import type { GeoFilters } from "@/lib/data/geography/types";
import { ExecutiveCommandCenter } from "@/components/dashboard/executive/command-center";
import { Skeleton } from "@/components/ui/skeleton";

function CommandCenterSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading command center">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function filtersFromSearch(sp: SearchParams): GeoFilters {
  return {
    country: first(sp.country) ?? "ID",
    province: first(sp.province) ?? "ALL",
    city: first(sp.city) ?? "ALL",
    site: first(sp.site) ?? "ALL",
    clientType: first(sp.clientType) ?? "ALL",
    clientId: first(sp.client) ?? "ALL",
    projectId: first(sp.project) ?? "ALL",
    periodId: first(sp.period) ?? "ALL",
    payrollStatus: first(sp.status) ?? "ALL",
    fundingType: first(sp.funding) ?? "ALL",
    currency: first(sp.currency) ?? "IDR",
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const scope = await measure(
    "dashboard.requireModule",
    () => requireModule("dashboard"),
    { route: "/dashboard", operation: "authorization" },
  );

  const sp = await searchParams;
  const filters = filtersFromSearch(sp);

  const [data, filterOptions, session] = await Promise.all([
    getExecutiveDashboardData(scope, filters),
    getExecutiveFilterOptions(scope),
    auth(),
  ]);

  const userName = session?.user?.name ?? scope.role.replaceAll("_", " ");
  const companyLabel =
    scope.role === "SUPER_ADMIN" || scope.role === "DIRECTOR"
      ? "MSG Technology · Indonesia-first"
      : "Managed Entity View";

  return (
    <Suspense fallback={<CommandCenterSkeleton />}>
      <ExecutiveCommandCenter
        data={data}
        filterOptions={filterOptions}
        userName={userName}
        companyLabel={companyLabel}
      />
    </Suspense>
  );
}
