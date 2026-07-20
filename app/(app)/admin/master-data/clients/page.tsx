export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { MasterDataNav } from "@/components/master-data/master-data-nav";
import { ClientsMasterClient } from "@/components/master-data/clients-master-client";
import { requireModule } from "@/lib/auth/session";
import { canMasterData } from "@/lib/master-data/permissions";

export default async function MasterDataClientsPage() {
  const scope = await requireModule("master_data");
  const canManage = canMasterData(scope.role, "MASTER_DATA_MANAGE");

  return (
    <div>
      <PageHeader
        eyebrow="Master data"
        title="Clients (billing parties)"
        description="Client = Company with entityKind CLIENT. Billing contacts and terms only — not CRM."
      />
      <MasterDataNav />
      <ClientsMasterClient canManage={canManage} />
    </div>
  );
}
