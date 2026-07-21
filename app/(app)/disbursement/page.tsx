export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { DisbursementTable } from "@/components/disbursement/disbursement-table";
import { getDisbursements } from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";

export default async function DisbursementPage() {
  const scope = await requireModule("disbursement");
  const batches = await getDisbursements(scope);

  return (
    <div>
      <PageHeader
        eyebrow="Payroll operations"
        title="Disbursement"
        description="Disbursement monitoring — batch status tracking after client transfer and confirmation. Canonical control plane remains Payment Instruction + Payment Confirmation."
      />
      <DisbursementTable data={batches} />
    </div>
  );
}
