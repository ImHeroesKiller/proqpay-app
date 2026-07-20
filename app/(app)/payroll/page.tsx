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
        eyebrow="Payroll operations"
        title="Payroll"
        description="Indonesian payroll periods — recalculate (BPJS/PPh21), submit approval, generate payment instructions, then client transfer confirmation."
      />
      <PayrollTable data={payrollPeriods} />
    </div>
  );
}
