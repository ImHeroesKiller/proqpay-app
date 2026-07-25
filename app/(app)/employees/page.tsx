export const dynamic = "force-dynamic";

import Link from "next/link";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeesList } from "@/components/employees/employees-list";
import { getEmployeeListPage } from "@/lib/data/employee-list";
import { requireModule } from "@/lib/auth/session";

type EmployeesPageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const scope = await requireModule("employees");
  const params = (await searchParams) ?? {};
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const result = await getEmployeeListPage(scope, {
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
    query: params.q,
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Master karyawan enterprise — data dari Supabase schema proqpay. Field sensitif dimasking."
        actions={
          <Link
            prefetch={false}
            href="/import"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-medium text-navy hover:bg-muted/40"
          >
            <Upload className="h-3.5 w-3.5" />
            Bulk Import
          </Link>
        }
      />
      <p className="mb-4 text-sm text-muted-foreground">
        Menampilkan <strong>{result.data.length}</strong> dari{" "}
        <strong>{result.total.toLocaleString("en-US")}</strong> karyawan. Data dimuat per halaman agar akses tetap cepat.
      </p>
      <EmployeesList {...result} />
    </div>
  );
}
