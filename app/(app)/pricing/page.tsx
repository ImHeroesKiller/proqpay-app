export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { getPricingRules } from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";

export default async function PricingPage() {
  const scope = await requireModule("pricing");
  const rows = await getPricingRules(scope);

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Pricing rules"
        description="Confidential commercial pricing. Rates are never shown on public pages or to unauthorized roles."
      />
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-between">
              <div>
                <p className="font-semibold">{r.companyName}</p>
                <p className="text-sm text-muted-foreground">
                  {r.pricingType.replaceAll("_", " ")} · base{" "}
                  {r.calculationBase.replaceAll("_", " ")}
                  {r.percentageRate != null
                    ? ` · ${r.percentageRate}%`
                    : ""}
                  {r.flatFee != null ? ` · ${formatRupiah(r.flatFee)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Effective from {r.effectiveFrom}
                </p>
              </div>
              <Badge variant="secondary">{r.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
