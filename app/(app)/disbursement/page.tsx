export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DisbursementTable } from "@/components/disbursement/disbursement-table";
import { getDisbursements } from "@/lib/data/queries";

export default async function DisbursementPage() {
  const batches = await getDisbursements();

  return (
    <div>
      <PageHeader
        title="Disbursement"
        description="Legacy execution batches for compatibility. Prefer Payment instructions for the canonical execution workflow (integration status may be SIMULATED)."
        actions={
          <Button variant="outline" size="sm" disabled>
            Reconcile (soon)
          </Button>
        }
      />
      <DisbursementTable data={batches} />
    </div>
  );
}
