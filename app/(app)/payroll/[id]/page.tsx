export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollLinesTable } from "@/components/payroll/payroll-lines-table";
import {
  getPayrollLines,
  getPayrollPeriodById,
} from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const period = await getPayrollPeriodById(id);

  if (!period) {
    notFound();
  }

  const lines = await getPayrollLines(period.id);

  return (
    <div>
      <PageHeader
        title={period.name}
        description="Preview lines, adjustments, and workflow actions."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/payroll">Back</Link>
            </Button>
            <Button variant="outline" size="sm" disabled>
              Export
            </Button>
            <Button variant="outline" size="sm" disabled>
              Lock
            </Button>
            <Button variant="accent" size="sm" disabled>
              Submit approval
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={period.status} />
        <span className="text-sm text-muted-foreground">
          Pay date {period.payDate}
        </span>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gross</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatRupiah(period.totalGross)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatRupiah(period.totalDeductions)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatRupiah(period.totalNet)}
          </CardContent>
        </Card>
      </div>

      <PayrollLinesTable data={lines} />
    </div>
  );
}
