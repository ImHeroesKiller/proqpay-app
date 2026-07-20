export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { MasterDataNav } from "@/components/master-data/master-data-nav";
import { SitesMasterClient } from "@/components/master-data/sites-master-client";
import { requireModule } from "@/lib/auth/session";
import { canMasterData } from "@/lib/master-data/permissions";

export default async function MasterDataSitesPage() {
  const scope = await requireModule("master_data");
  return (
    <div>
      <PageHeader
        eyebrow="Master data"
        title="Sites"
        description="Operational locations under a client. A project may have many sites — sites do not replace projects."
      />
      <MasterDataNav />
      <SitesMasterClient canManage={canMasterData(scope.role, "MASTER_DATA_MANAGE")} />
    </div>
  );
}
