export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { getSalesOpportunities } from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";

export default async function SalesPage() {
  const scope = await requireModule("sales_pipeline");
  const rows = await getSalesOpportunities(scope);
  const weighted = rows.reduce((s, r) => s + r.weightedPipelineValue, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Commercial"
        title="Sales pipeline"
        description="Internal commercial pipeline only. Not exposed on the public website or to client users."
      />
      <Card className="mb-4">
        <CardContent className="p-4 text-sm">
          Weighted pipeline value:{" "}
          <span className="font-semibold">{formatRupiah(weighted)}</span>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-between">
              <div>
                <p className="font-semibold">{r.prospectName}</p>
                <p className="text-sm text-muted-foreground">
                  Est. {formatRupiah(r.estimatedPayrollValue)} · Probability{" "}
                  {r.probabilityPercentage}% · Weighted{" "}
                  {formatRupiah(r.weightedPipelineValue)}
                </p>
                {r.fundingInterest ? (
                  <p className="text-xs text-muted-foreground">
                    Funding interest · proposed{" "}
                    {r.proposedFundingModel ?? "TBD"}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{r.stage}</Badge>
                <Badge variant="secondary">{r.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
