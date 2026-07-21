export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { EngineNav } from "@/components/payroll-engine/engine-nav";
import { CompareClient } from "@/components/payroll-engine/compare-client";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  await requireModule("payroll");
  const sp = await searchParams;
  return (
    <div>
      <PageHeader
        eyebrow="Payroll Engine"
        title="Calculation comparison"
        description="Compare two calculation runs for the same period. Highlights per-employee gross, tax, BPJS, and net deltas."
      />
      <EngineNav current="/payroll-engine/compare" />
      <CompareClient defaultPeriodId={sp.periodId} />
    </div>
  );
}
