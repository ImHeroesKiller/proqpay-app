export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { ReceivablesClient } from "@/components/finance/receivables-client";
import { requireModule } from "@/lib/auth/session";

export default async function FinanceReceivablesPage() {
  await requireModule("receivables");

  return (
    <div>
      <PageHeader
        eyebrow="Collection"
        title="Receivables"
        description="Account receivable ledger derived from issued invoices. Aging and outstanding update when payments are allocated."
      />
      <ReceivablesClient />
    </div>
  );
}
