export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { AuditTable } from "@/components/audit/audit-table";
import { getAuditLogs } from "@/lib/data/queries";

export default async function AuditPage() {
  const auditLogs = await getAuditLogs();

  return (
    <div>
      <PageHeader
        title="Audit trail"
        description="Every material action is logged with user, entity, and timestamp."
      />
      <AuditTable data={auditLogs} />
    </div>
  );
}
