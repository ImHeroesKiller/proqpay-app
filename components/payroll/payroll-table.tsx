"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatRupiah } from "@/lib/utils";
import type { PayrollPeriod } from "@/types";

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

export function PayrollTable({ data }: { data: PayrollPeriod[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search periods..."
    />
  );
}
