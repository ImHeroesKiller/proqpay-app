export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { WorkingCapitalTable } from "@/components/working-capital/working-capital-table";
import { getWorkingCapitalRequests } from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";

export default async function WorkingCapitalPage() {
  const workingCapitalRequests = await getWorkingCapitalRequests();

  const requested = workingCapitalRequests
    .filter((w) => w.status === "REQUESTED")
    .reduce((s, w) => s + w.requestedAmount, 0);
  const approved = workingCapitalRequests
    .filter((w) => w.status === "APPROVED" || w.status === "OUTSTANDING")
    .reduce((s, w) => s + w.approvedAmount, 0);
  const outstanding = workingCapitalRequests
    .filter(
      (w) =>
        w.status === "APPROVED" ||
        w.status === "OUTSTANDING" ||
        w.status === "DISBURSED",
    )
    .reduce((s, w) => s + (w.approvedAmount - w.repaidAmount), 0);
  const repaid = workingCapitalRequests.reduce(
    (s, w) => s + w.repaidAmount,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Working capital"
        description="Finance payroll before payday with controlled funding requests and repayment tracking."
        actions={
          <Button variant="accent" size="sm" disabled>
            New request
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          item={{
            label: "Requested",
            value: formatRupiah(requested),
            trend: "neutral",
          }}
        />
        <KpiCard
          item={{
            label: "Approved / available",
            value: formatRupiah(approved),
            trend: "up",
          }}
        />
        <KpiCard
          item={{
            label: "Outstanding",
            value: formatRupiah(outstanding),
            trend: "down",
          }}
        />
        <KpiCard
          item={{
            label: "Repaid",
            value: formatRupiah(repaid),
            trend: "up",
          }}
        />
      </div>

      <WorkingCapitalTable data={workingCapitalRequests} />
      <p className="mt-4 text-xs text-muted-foreground">
        Banking and settlement integrations are future-ready placeholders in this
        release. Data source: Supabase PostgreSQL via Prisma.
      </p>
    </div>
  );
}
