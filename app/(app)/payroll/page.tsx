export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PayrollTable } from "@/components/payroll/payroll-table";
import { getPayrollPeriods } from "@/lib/data/queries";
import { Plus } from "lucide-react";

export default async function PayrollPage() {
  const payrollPeriods = await getPayrollPeriods();

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Generate, adjust, preview, lock, and approve payroll periods."
        actions={
          <Button variant="accent" size="sm" disabled>
            <Plus className="h-3.5 w-3.5" />
            Generate payroll
          </Button>
        }
      />
      <PayrollTable data={payrollPeriods} />
    </div>
  );
}
