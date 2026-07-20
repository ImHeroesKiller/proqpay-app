export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmployeesTable } from "@/components/employees/employees-table";
import { getEmployees } from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";
import { Upload } from "lucide-react";

export default async function EmployeesPage() {
  const scope = await requireModule("employees");
  const employees = await getEmployees(scope);

  return (
    <div>
      <PageHeader
        eyebrow="Payroll operations"
        title="Employees"
        description="Payroll-relevant employee directory — bank, tax, BPJS, and employment status. Not a full HRIS."
        actions={
          <>
            <Button variant="outline" size="sm" disabled title="Coming soon">
              <Upload className="h-3.5 w-3.5" />
              Bulk upload
            </Button>
            <Button size="sm" disabled title="Coming soon">
              Add employee
            </Button>
          </>
        }
      />
      <EmployeesTable data={employees} />
    </div>
  );
}
