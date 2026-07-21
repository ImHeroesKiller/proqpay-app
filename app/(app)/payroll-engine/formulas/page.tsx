export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { EngineNav } from "@/components/payroll-engine/engine-nav";
import { FormulasClient } from "@/components/payroll-engine/formulas-client";

export default async function FormulasPage() {
  const scope = await requireModule("payroll");
  return (
    <div>
      <PageHeader
        eyebrow="Payroll Engine"
        title="Formula management"
        description="Draft → Active → Deprecated. Active formula expressions cannot be edited; create a new version instead."
      />
      <EngineNav current="/payroll-engine/formulas" />
      <FormulasClient defaultCompanyId={scope.companyId} />
    </div>
  );
}
