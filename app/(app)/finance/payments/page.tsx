export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { PaymentsClient } from "@/components/finance/payments-client";
import { requireModule } from "@/lib/auth/session";

export default async function FinancePaymentsPage() {
  const scope = await requireModule("client_payments");

  return (
    <div>
      <PageHeader
        eyebrow="Collection"
        title="Client payments"
        description="Record client receipts and allocate to open invoices. Allocation updates invoice outstanding and receivables."
      />
      <PaymentsClient
        organizationId={scope.organizationId}
        companyId={scope.companyId}
      />
    </div>
  );
}
