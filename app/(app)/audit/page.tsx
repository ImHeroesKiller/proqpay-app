"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { auditLogs } from "@/lib/data/seed";
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

export default function AuditPage() {
  return (
    <div>
      <PageHeader
        title="Audit trail"
        description="Every material action is logged with user, entity, and timestamp."
      />
      <DataTable
        columns={columns}
        data={auditLogs}
        searchPlaceholder="Search actions, users, entities..."
      />
    </div>
  );
}
