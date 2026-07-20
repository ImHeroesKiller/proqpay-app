"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { AuditLog } from "@/types";

const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => formatDate(row.original.timestamp),
  },
  { accessorKey: "userName", header: "User" },
  {
    accessorKey: "userRole",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.userRole.replaceAll("_", " ")}
      </Badge>
    ),
  },
  { accessorKey: "action", header: "Action" },
  { accessorKey: "entity", header: "Entity" },
  { accessorKey: "entityId", header: "Entity ID" },
  { accessorKey: "ip", header: "IP" },
];

export function AuditTable({ data }: { data: AuditLog[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search actions, users, entities..."
    />
  );
}
