export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { EngineNav } from "@/components/payroll-engine/engine-nav";
import { ValidationCenterClient } from "@/components/payroll-engine/validation-center-client";

export default async function ValidationsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string; calculationId?: string }>;
}) {
  await requireModule("payroll");
  const sp = await searchParams;
  return (
    <div>
      <PageHeader
        eyebrow="Payroll Engine"
        title="Validation center"
        description="Errors, warnings, and blockers from calculation runs. Resolve or ignore, then re-run validation before projection."
      />
      <EngineNav current="/payroll-engine/validations" />
      <ValidationCenterClient
        defaultPeriodId={sp.periodId}
        defaultCalculationId={sp.calculationId}
      />
    </div>
  );
}
