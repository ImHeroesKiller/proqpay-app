"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRupiah } from "@/lib/utils";
import { maskAccountNumber } from "@/lib/security/mask";
import type { Employee } from "@/types";

export type EmployeeRow = Employee & {
  clientName?: string;
  projectName?: string;
  payrollGroupName?: string;
  bankMasked?: string;
  dataQuality?: string;
};

const columns: ColumnDef<EmployeeRow>[] = [
  {
    accessorKey: "employeeCode",
    header: "Kode",
    cell: ({ row }) => (
      <Link
        href={`/employees/${row.original.id}`}
        className="font-medium text-msg-blue hover:underline dark:text-sky-300"
      >
        {row.original.employeeCode}
      </Link>
    ),
  },
  { accessorKey: "name", header: "Nama" },
  {
    id: "client",
    header: "Client",
    cell: ({ row }) => row.original.clientName ?? "—",
  },
  {
    id: "project",
    header: "Project",
    cell: ({ row }) => row.original.projectName ?? "—",
  },
  {
    id: "payrollGroup",
    header: "Payroll group",
    cell: ({ row }) => row.original.payrollGroupName ?? "—",
  },
  { accessorKey: "department", header: "Departemen" },
  { accessorKey: "position", header: "Jabatan" },
  {
    accessorKey: "baseSalary",
    header: "Gaji pokok",
    cell: ({ row }) => formatRupiah(row.original.baseSalary),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "bank",
    header: "Rekening",
    cell: ({ row }) =>
      row.original.bankMasked ??
      maskAccountNumber(row.original.bankAccount),
  },
  {
    id: "tax",
    header: "Pajak",
    cell: ({ row }) => row.original.taxStatus || "—",
  },
  {
    id: "quality",
    header: "Data quality",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.dataQuality ?? "OK"}
      </span>
    ),
  },
];

export function EmployeesTable({ data }: { data: EmployeeRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Cari kode, nama, departemen…"
    />
  );
}
