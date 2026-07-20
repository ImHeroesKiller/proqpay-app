export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { MasterDataNav } from "@/components/master-data/master-data-nav";
import { PayCyclesMasterClient } from "@/components/master-data/pay-cycles-master-client";
import { requireModule } from "@/lib/auth/session";
import { canMasterData } from "@/lib/master-data/permissions";

export default async function MasterDataPayCyclesPage() {
  const scope = await requireModule("master_data");
  return (
    <div>
      <PageHeader
        eyebrow="Master data"
        title="Pay cycles"
        description="Frequency, cutoff, approval lag, and payment day. CUSTOM uses validated JSON config only."
      />
      <MasterDataNav />
      <PayCyclesMasterClient
        canManage={canMasterData(scope.role, "PAY_CYCLE_MANAGE")}
      />
    </div>
  );
}
