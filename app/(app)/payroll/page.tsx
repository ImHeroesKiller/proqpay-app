export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { PayrollTable } from "@/components/payroll/payroll-table";
import { getPayrollPeriods } from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";

export default async function PayrollPage() {
  const scope = await requireModule("payroll");
  const payrollPeriods = await getPayrollPeriods(scope);

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Indonesian payroll periods — open a period to recalculate (BPJS/PPh21), submit approval, and generate payment instructions."
      />
      <PayrollTable data={payrollPeriods} />
    </div>
  );
}
