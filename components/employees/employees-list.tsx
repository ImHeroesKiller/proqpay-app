import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRupiah } from "@/lib/utils";
import type { EmployeeListRow } from "@/lib/data/employee-list";

type Props = {
  data: EmployeeListRow[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
};

function pageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/employees?${search}` : "/employees";
}

export function EmployeesList({ data, total, page, pageCount, query }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/employees" method="get" className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.85}
          />
          <input
            name="q"
            defaultValue={query}
            placeholder="Cari kode, nama, departemen…"
            className="h-10 w-full rounded-2xl border border-input bg-background px-3 pl-9 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cari karyawan"
          />
        </form>
        <p className="text-xs text-muted-foreground">
          {total.toLocaleString("en-US")} karyawan · 25 per halaman
        </p>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="border-b border-border bg-muted/70">
              <tr>
                {["Kode", "Nama", "Client", "Project", "Payroll group", "Departemen", "Jabatan", "Gaji pokok", "Status", "Rekening", "Pajak", "Data quality"].map((label) => (
                  <th
                    key={label}
                    className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/35"
                  >
                    <td className="px-4 py-3">
                      <Link
                        prefetch={false}
                        href={`/employees/${employee.id}`}
                        className="font-medium text-msg-blue hover:underline dark:text-sky-300"
                      >
                        {employee.employeeCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{employee.name}</td>
                    <td className="px-4 py-3">{employee.clientName}</td>
                    <td className="px-4 py-3">{employee.projectName}</td>
                    <td className="px-4 py-3">{employee.payrollGroupName}</td>
                    <td className="px-4 py-3">{employee.department}</td>
                    <td className="px-4 py-3">{employee.position}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatRupiah(employee.baseSalary)}</td>
                    <td className="px-4 py-3"><StatusBadge status={employee.status} /></td>
                    <td className="px-4 py-3">{employee.bankMasked}</td>
                    <td className="px-4 py-3">{employee.taxStatus}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{employee.dataQuality}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="h-24 text-center text-muted-foreground">
                    Tidak ada karyawan yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Halaman {page} dari {pageCount}
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              prefetch={false}
              href={pageHref(page - 1, query)}
              className="inline-flex h-9 items-center rounded-xl border border-border bg-white px-3 text-sm font-medium hover:bg-muted/40"
            >
              Previous
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-sm text-muted-foreground opacity-50">
              Previous
            </span>
          )}
          {page < pageCount ? (
            <Link
              prefetch={false}
              href={pageHref(page + 1, query)}
              className="inline-flex h-9 items-center rounded-xl border border-border bg-white px-3 text-sm font-medium hover:bg-muted/40"
            >
              Next
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-sm text-muted-foreground opacity-50">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
