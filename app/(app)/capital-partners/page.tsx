export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { getCapitalPartners } from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";

export default async function CapitalPartnersPage() {
  const scope = await requireModule("capital_partners");
  const rows = await getCapitalPartners(scope);

  return (
    <div>
      <PageHeader
        title="Capital partners"
        description="Internal funding partners. Terms and exposures are confidential operational data."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{p.displayName}</p>
                <Badge variant="secondary">{p.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{p.legalName}</p>
              <p className="text-sm text-muted-foreground">
                Committed {formatRupiah(p.committedCapital)} · Available{" "}
                {formatRupiah(p.availableCapital)}
              </p>
              <p className="text-xs text-muted-foreground">
                Agreement: {p.agreementStatus}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
