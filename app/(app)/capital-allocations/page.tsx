export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { getCapitalAllocations } from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";

export default async function CapitalAllocationsPage() {
  const scope = await requireModule("capital_allocations");
  const rows = await getCapitalAllocations(scope);

  return (
    <div>
      <PageHeader
        title="Capital allocations"
        description="Links working-capital requests to partners. Revenue-share details stay internal."
      />
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allocations yet.</p>
        ) : null}
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-between">
              <div>
                <p className="font-semibold">{a.partnerName}</p>
                <p className="text-sm text-muted-foreground">
                  {a.periodName} · Allocated {formatRupiah(a.allocatedAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Platform fee {formatRupiah(a.platformFeeAmount)}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{a.allocationStatus}</Badge>
                <Badge variant="secondary">{a.settlementStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
