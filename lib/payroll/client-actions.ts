"use server";

import { requireSession } from "@/lib/auth/session";
import { generatePayslips, lockPayrollPeriod } from "@/lib/payroll/actions";

export async function generatePayslipsAction(periodId: string) {
  try {
    const scope = await requireSession();
    const result = await generatePayslips(scope, periodId);
    return { ok: true as const, created: result.created };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Gagal generate payslip",
    };
  }
}

export async function lockPayrollAction(periodId: string) {
  try {
    const scope = await requireSession();
    await lockPayrollPeriod(scope, periodId);
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Gagal mengunci payroll",
    };
  }
}
