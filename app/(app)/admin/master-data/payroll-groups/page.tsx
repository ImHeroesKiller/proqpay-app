export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { MasterDataNav } from "@/components/master-data/master-data-nav";
import { PayrollGroupsMasterClient } from "@/components/master-data/payroll-groups-master-client";
import { requireModule } from "@/lib/auth/session";
import { canMasterData } from "@/lib/master-data/permissions";

export default async function MasterDataPayrollGroupsPage() {
  const scope = await requireModule("master_data");
  return (
    <div>
      <PageHeader
        eyebrow="Master data"
        title="Payroll groups"
        description="Population processed together — bound to a pay cycle, optional project/site."
      />
      <MasterDataNav />
      <PayrollGroupsMasterClient
        canManage={canMasterData(scope.role, "PAYROLL_GROUP_MANAGE")}
      />
    </div>
  );
}
