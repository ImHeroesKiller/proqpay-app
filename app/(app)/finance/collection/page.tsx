export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { CollectionClient } from "@/components/finance/collection-client";
import { requireModule } from "@/lib/auth/session";

export default async function FinanceCollectionPage() {
  const scope = await requireModule("collection");

  return (
    <div>
      <PageHeader
        eyebrow="Collection"
        title="Collection activities"
        description="Log calls, reminders, and escalation notes against AR. Complements invoice and payment workflows."
      />
      <CollectionClient companyId={scope.companyId} />
    </div>
  );
}
