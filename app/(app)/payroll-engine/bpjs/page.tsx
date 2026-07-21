export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { EngineNav } from "@/components/payroll-engine/engine-nav";
import { BpjsConfigClient } from "@/components/payroll-engine/bpjs-config-client";

export default async function BpjsConfigPage() {
  const scope = await requireModule("payroll");
  return (
    <div>
      <PageHeader
        eyebrow="Payroll Engine"
        title="BPJS configuration"
        description="Versioned BPJS Kesehatan and Ketenagakerjaan shares and ceilings. Calculation always reads the active version."
      />
      <EngineNav current="/payroll-engine/bpjs" />
      <BpjsConfigClient defaultCompanyId={scope.companyId} />
    </div>
  );
}
