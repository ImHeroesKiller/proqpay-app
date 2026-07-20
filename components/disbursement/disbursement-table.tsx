"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatRupiah } from "@/lib/utils";
import type { DisbursementBatch } from "@/types";

const columns: ColumnDef<DisbursementBatch>[] = [
  { accessorKey: "periodName", header: "Period" },
  { accessorKey: "bankName", header: "Bank" },
  {
    accessorKey: "totalAmount",
    header: "Amount",
    cell: ({ row }) => formatRupiah(row.original.totalAmount),
  },
  { accessorKey: "itemCount", header: "Items" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  { accessorKey: "referenceNumber", header: "Reference" },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export function DisbursementTable({ data }: { data: DisbursementBatch[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search batches, banks, references..."
    />
  );
}
