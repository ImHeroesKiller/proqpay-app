"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { payrollPeriods } from "@/lib/data/seed";
import { formatDate, formatRupiah } from "@/lib/utils";
import type { PayrollPeriod } from "@/types";
import { Plus } from "lucide-react";

const columns: ColumnDef<PayrollPeriod>[] = [
  {
    accessorKey: "name",
    header: "Period",
    cell: ({ row }) => (
      <Link
        href={`/payroll/${row.original.id}`}
        className="font-medium text-msg-blue hover:underline dark:text-sky-300"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "periodStart",
    header: "Range",
    cell: ({ row }) =>
      `${formatDate(row.original.periodStart)} – ${formatDate(row.original.periodEnd)}`,
  },
  {
    accessorKey: "payDate",
    header: "Pay date",
    cell: ({ row }) => formatDate(row.original.payDate),
  },
  {
    accessorKey: "employeeCount",
    header: "Employees",
  },
  {
    accessorKey: "totalNet",
    header: "Net payroll",
    cell: ({ row }) => formatRupiah(row.original.totalNet),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export default function PayrollPage() {
  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Generate, adjust, preview, lock, and approve payroll periods."
        actions={
          <Button variant="accent" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Generate payroll
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={payrollPeriods}
        searchPlaceholder="Search periods..."
      />
    </div>
  );
}
