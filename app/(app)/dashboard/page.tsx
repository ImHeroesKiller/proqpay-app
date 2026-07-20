export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { auth } from "@/lib/auth";
import { requireModule } from "@/lib/auth/session";
import { measure } from "@/lib/perf";
import { Skeleton } from "@/components/ui/skeleton";

const ExecutiveCommandCenter = dynamicImport(
  () =>
    import("@/components/dashboard/executive/command-center").then((m) => ({
      default: m.ExecutiveCommandCenter,
    })),
  {
    loading: () => <CommandCenterSkeleton />,
  },
);

function CommandCenterSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading command center">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-96 rounded-2xl xl:col-span-5" />
        <Skeleton className="h-96 rounded-2xl xl:col-span-3" />
        <Skeleton className="h-96 rounded-2xl xl:col-span-4" />
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

export default async function DashboardPage() {
  const scope = await measure(
    "dashboard.requireModule",
    () => requireModule("dashboard"),
    { route: "/dashboard", operation: "authorization" },
  );

  const session = await auth();
  const userName = session?.user?.name ?? scope.role.replaceAll("_", " ");
  const companyLabel =
    scope.role === "SUPER_ADMIN" || scope.role === "DIRECTOR"
      ? "MSG Technology · Global"
      : "Managed Entity View";

  return (
    <ExecutiveCommandCenter userName={userName} companyLabel={companyLabel} />
  );
}
