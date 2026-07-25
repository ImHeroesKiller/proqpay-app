export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { EmployeesTable } from "@/components/employees/employees-table";
import { getEmployees } from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";
import Link from "next/link";
import { Upload } from "lucide-react";

export default async function EmployeesPage() {
  const scope = await requireModule("employees");
  const employees = await getEmployees(scope);

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Master karyawan enterprise — data dari Supabase schema proqpay. Field sensitif dimasking."
        actions={
          <>
            <Link
              href="/import"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-medium text-navy hover:bg-muted/40"
            >
              <Upload className="h-3.5 w-3.5" />
              Bulk Import
            </Link>
          </>
        }
      />
      <p className="mb-4 text-sm text-muted-foreground">
        Menampilkan <strong>{employees.length}</strong> karyawan dari database.
        Gunakan Bulk Import Center untuk unggah Excel resmi.
      </p>
      <EmployeesTable data={employees} />
    </div>
  );
}
