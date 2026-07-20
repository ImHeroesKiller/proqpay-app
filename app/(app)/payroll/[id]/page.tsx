"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { payrollLines, payrollPeriods } from "@/lib/data/seed";
import { formatRupiah } from "@/lib/utils";
import type { PayrollLine } from "@/types";

const columns: ColumnDef<PayrollLine>[] = [
  { accessorKey: "employeeName", header: "Employee" },
  { accessorKey: "department", header: "Dept" },
  {
    accessorKey: "baseSalary",
    header: "Base",
    cell: ({ row }) => formatRupiah(row.original.baseSalary),
  },
  {
    accessorKey: "allowances",
    header: "Allowances",
    cell: ({ row }) => formatRupiah(row.original.allowances),
  },
  {
    accessorKey: "overtime",
    header: "OT",
    cell: ({ row }) => formatRupiah(row.original.overtime),
  },
  {
    accessorKey: "bonuses",
    header: "Bonus",
    cell: ({ row }) => formatRupiah(row.original.bonuses),
  },
  {
    accessorKey: "deductions",
    header: "Deductions",
    cell: ({ row }) => formatRupiah(row.original.deductions),
  },
  {
    accessorKey: "tax",
    header: "Tax",
    cell: ({ row }) => formatRupiah(row.original.tax),
  },
  {
    accessorKey: "bpjs",
    header: "BPJS",
    cell: ({ row }) => formatRupiah(row.original.bpjs),
  },
  {
    accessorKey: "netPay",
    header: "Net",
    cell: ({ row }) => (
      <span className="font-semibold">{formatRupiah(row.original.netPay)}</span>
    ),
  },
];

export default function PayrollDetailPage() {
  const params = useParams<{ id: string }>();
  const period = payrollPeriods.find((p) => p.id === params.id);
  const lines = payrollLines.filter((l) => l.payrollPeriodId === params.id);

  if (!period) {
    return (
      <div>
        <PageHeader title="Payroll not found" />
        <Button asChild variant="outline">
          <Link href="/payroll">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={period.name}
        description="Preview lines, adjustments, and workflow actions."
        actions={
          <>
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button variant="outline" size="sm">
              Lock
            </Button>
            <Button variant="accent" size="sm">
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

      <DataTable
        columns={columns}
        data={lines.length ? lines : payrollLines}
        searchPlaceholder="Search employee lines..."
      />
    </div>
  );
}
