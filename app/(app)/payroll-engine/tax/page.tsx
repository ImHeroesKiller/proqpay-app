export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { EngineNav } from "@/components/payroll-engine/engine-nav";
import { TaxConfigClient } from "@/components/payroll-engine/tax-config-client";

export default async function TaxConfigPage() {
  const scope = await requireModule("payroll");
  return (
    <div>
      <PageHeader
        eyebrow="Payroll Engine"
        title="Tax configuration"
        description="Versioned TER/tax profiles with PTKP JSON. Active versions are used by calculation; changes create a new version."
      />
      <EngineNav current="/payroll-engine/tax" />
      <TaxConfigClient defaultCompanyId={scope.companyId} />
    </div>
  );
}
