export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { PayrollTable } from "@/components/payroll/payroll-table";
import { CreatePeriodForm } from "@/components/payroll/create-period-form";
import { getPayrollPeriods } from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";
import { canMasterData } from "@/lib/master-data/permissions";

export default async function PayrollPage() {
  const scope = await requireModule("payroll");
  const payrollPeriods = await getPayrollPeriods(scope);
  const canCreate = canMasterData(scope.role, "PAYROLL_PERIOD_CREATE");

  return (
    <div>
      <PageHeader
        eyebrow="Payroll operations"
        title="Payroll"
        description="Indonesian payroll periods — create from payroll group + pay cycle, then recalculate, approve, and confirm payments."
      />
      {canCreate ? <CreatePeriodForm /> : null}
      <PayrollTable data={payrollPeriods} />
    </div>
  );
}
