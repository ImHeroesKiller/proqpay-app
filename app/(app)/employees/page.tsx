export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmployeesTable } from "@/components/employees/employees-table";
import { getEmployees } from "@/lib/data/queries";
import { Upload } from "lucide-react";

export default async function EmployeesPage() {
  const employees = await getEmployees();

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
        Bulk upload is a placeholder for future CSV/XLSX import. Data source:
        Supabase PostgreSQL via Prisma.
      </p>
      <EmployeesTable data={employees} />
    </div>
  );
}
