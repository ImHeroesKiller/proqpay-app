export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { SchemeBuilderClient } from "@/components/scheme/scheme-builder-client";
import { listSchemeConversations } from "@/lib/scheme/actions";
import { requireModule } from "@/lib/auth/session";

export default async function SchemeBuilderPage() {
  await requireModule("scheme_builder");
  let conversations: Awaited<ReturnType<typeof listSchemeConversations>> = [];
  try {
    conversations = await listSchemeConversations();
  } catch {
    conversations = [];
  }

  return (
    <div>
      <PageHeader
        title="AI Payroll Scheme Builder"
        description="Percakapan terpandu untuk menyusun skema payroll. Draft → simulasi → approval → aktivasi."
      />
      <SchemeBuilderClient initialConversations={conversations} />
    </div>
  );
}
