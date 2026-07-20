"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { employees } from "@/lib/data/seed";
import { formatRupiah } from "@/lib/utils";
import type { Employee } from "@/types";
import { Upload } from "lucide-react";

const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: "employeeCode",
    header: "Code",
    cell: ({ row }) => (
      <Link
        href={`/employees/${row.original.id}`}
        className="font-medium text-msg-blue hover:underline dark:text-sky-300"
      >
        {row.original.employeeCode}
      </Link>
    ),
  },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "position", header: "Position" },
  {
    accessorKey: "baseSalary",
    header: "Base salary",
    cell: ({ row }) => formatRupiah(row.original.baseSalary),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  { accessorKey: "bankName", header: "Bank" },
];

export default function EmployeesPage() {
  return (
    <div>
      <PageHeader
        title="Employees"
        description="Payroll-relevant employee directory. Not a full HRIS."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              <Upload className="h-3.5 w-3.5" />
              Bulk upload
            </Button>
            <Button size="sm" disabled>
              Add employee
            </Button>
          </>
        }
      />
      <p className="mb-4 text-xs text-muted-foreground">
        Bulk upload is a placeholder for future CSV/XLSX import.
      </p>
      <DataTable
        columns={columns}
        data={employees}
        searchPlaceholder="Search employees, departments, banks..."
      />
    </div>
  );
}
