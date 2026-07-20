"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { workingCapitalRequests } from "@/lib/data/seed";
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

export default function WorkingCapitalPage() {
  const requested = workingCapitalRequests
    .filter((w) => w.status === "REQUESTED")
    .reduce((s, w) => s + w.requestedAmount, 0);
  const approved = workingCapitalRequests
    .filter((w) => w.status === "APPROVED" || w.status === "OUTSTANDING")
    .reduce((s, w) => s + w.approvedAmount, 0);
  const outstanding = workingCapitalRequests
    .filter((w) => w.status === "APPROVED" || w.status === "OUTSTANDING" || w.status === "DISBURSED")
    .reduce((s, w) => s + (w.approvedAmount - w.repaidAmount), 0);
  const repaid = workingCapitalRequests.reduce((s, w) => s + w.repaidAmount, 0);

  return (
    <div>
      <PageHeader
        title="Working capital"
        description="Finance payroll before payday with controlled funding requests and repayment tracking."
        actions={
          <Button variant="accent" size="sm">
            New request
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          item={{ label: "Requested", value: formatRupiah(requested), trend: "neutral" }}
        />
        <KpiCard
          item={{ label: "Approved / available", value: formatRupiah(approved), trend: "up" }}
        />
        <KpiCard
          item={{ label: "Outstanding", value: formatRupiah(outstanding), trend: "down" }}
        />
        <KpiCard
          item={{ label: "Repaid", value: formatRupiah(repaid), trend: "up" }}
        />
      </div>

      <DataTable
        columns={columns}
        data={workingCapitalRequests}
        searchPlaceholder="Search WC requests..."
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Banking and settlement integrations are future-ready placeholders in this
        release.
      </p>
    </div>
  );
}
