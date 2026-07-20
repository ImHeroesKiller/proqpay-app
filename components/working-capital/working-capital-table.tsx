"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatRupiah } from "@/lib/utils";
import type { WorkingCapitalRequest } from "@/types";

const columns: ColumnDef<WorkingCapitalRequest>[] = [
  { accessorKey: "periodName", header: "Period" },
  {
    accessorKey: "requestedAmount",
    header: "Requested",
    cell: ({ row }) => formatRupiah(row.original.requestedAmount),
  },
  {
    accessorKey: "approvedAmount",
    header: "Approved",
    cell: ({ row }) => formatRupiah(row.original.approvedAmount),
  },
  {
    accessorKey: "repaidAmount",
    header: "Repaid",
    cell: ({ row }) => formatRupiah(row.original.repaidAmount),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "dueDate",
    header: "Due",
    cell: ({ row }) => formatDate(row.original.dueDate),
  },
];

export function WorkingCapitalTable({
  data,
}: {
  data: WorkingCapitalRequest[];
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search WC requests..."
    />
  );
}
