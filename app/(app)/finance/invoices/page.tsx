export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { InvoicesClient } from "@/components/finance/invoices-client";
import { requireModule } from "@/lib/auth/session";

export default async function FinanceInvoicesPage() {
  await requireModule("invoices");

  return (
    <div>
      <PageHeader
        eyebrow="Client billing"
        title="Invoices"
        description="Draft → approve → issue payroll-linked invoices. Issuing opens the AR receivable. Use payroll period detail to generate a draft from payroll totals."
      />
      <InvoicesClient />
    </div>
  );
}
