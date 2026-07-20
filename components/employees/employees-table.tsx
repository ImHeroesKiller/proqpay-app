"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRupiah } from "@/lib/utils";
import type { Employee } from "@/types";

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

export function EmployeesTable({ data }: { data: Employee[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search employees, departments, banks..."
    />
  );
}
