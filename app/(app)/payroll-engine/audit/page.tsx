export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { EngineNav } from "@/components/payroll-engine/engine-nav";
import { AuditTrailClient } from "@/components/payroll-engine/audit-trail-client";

export default async function AuditTrailPage({
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
        title="Payroll audit trail"
        description="Trace one employee from attendance through formula, tax, BPJS, calculation components, projection, and final PayrollLine."
      />
      <EngineNav current="/payroll-engine/audit" />
      <AuditTrailClient defaultPeriodId={sp.periodId} />
    </div>
  );
}
