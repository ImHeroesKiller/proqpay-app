export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { getClients } from "@/lib/data/queries";
import { fundingModelLabel } from "@/lib/domain/workflow";
import { Building2 } from "lucide-react";

export default async function ClientsPage() {
  const scope = await requireModule("clients");
  const clients = await getClients(scope);

  return (
    <div>
      <PageHeader
        eyebrow="Commercial"
        title="Clients"
        description="Internal client lifecycle. Confidential commercial notes and limits are role-restricted."
      />
      {clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients"
          description="Client companies will appear here for authorized commercial roles."
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {clients.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.legalName ?? "—"}
                  </p>
                </div>
                <Badge variant="secondary">{c.lifecycleStatus}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {c.industry ?? "Industry n/a"} · Default funding:{" "}
                {fundingModelLabel(c.defaultFundingModel)}
              </p>
              <p className="text-xs text-muted-foreground">
                WC facility: {c.workingCapitalStatus}
                {c.goLiveDate ? ` · Go-live ${c.goLiveDate}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
