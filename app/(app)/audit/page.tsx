export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { AuditTable } from "@/components/audit/audit-table";
import { getAuditLogs } from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";

export default async function AuditPage() {
  const scope = await requireModule("audit");
  const auditLogs = await getAuditLogs(scope);

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        description="Every material action is logged with user, entity, and timestamp for governance and investigation."
      />
      <AuditTable data={auditLogs} />
    </div>
  );
}
