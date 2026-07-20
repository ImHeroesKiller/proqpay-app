"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
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

export function PayrollLinesTable({ data }: { data: PayrollLine[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search employee lines..."
    />
  );
}
