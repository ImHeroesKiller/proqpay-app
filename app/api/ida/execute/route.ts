import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyConfirmationToken } from "@/lib/ida/confirmation";
import {
  generatePayslips,
  lockPayrollPeriod,
  recalculatePayrollPeriod,
  submitPayrollForApproval,
} from "@/lib/payroll/actions";
import type { IdaExecuteRequest, IdaExecuteResponse } from "@/lib/ida/contracts";
import type { SessionScope } from "@/lib/auth/scope";

export const runtime = "nodejs";

function periodId(payload?: Record<string, string | number | boolean | null>) {
  const value = payload?.periodId;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Payroll period belum dipilih. Sebutkan atau pilih periode terlebih dahulu.");
  }
  return value.trim();
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as IdaExecuteRequest;
    const proposal = verifyConfirmationToken(body.confirmationToken, session.user.id);
    const scope: SessionScope = {
      userId: session.user.id,
      role: session.user.role,
      organizationId: session.user.organizationId,
      companyId: session.user.companyId,
    };

    let message = "Aksi selesai.";
    let refreshDashboard = true;
    let adminHref = proposal.adminHref;

    switch (proposal.type) {
      case "REFRESH_DASHBOARD":
        message = "Dashboard sudah diperbarui dengan data terbaru.";
        break;
      case "RECALCULATE_PAYROLL":
        await recalculatePayrollPeriod(scope, periodId(proposal.payload));
        message = "Payroll berhasil dihitung ulang dan dashboard telah diperbarui.";
        break;
      case "SUBMIT_PAYROLL_APPROVAL":
        await submitPayrollForApproval(scope, periodId(proposal.payload));
        message = "Payroll berhasil diajukan ke approval queue.";
        break;
      case "LOCK_PAYROLL":
        await lockPayrollPeriod(scope, periodId(proposal.payload));
        message = "Payroll berhasil dikunci. Perubahan berikutnya harus melalui correction run.";
        break;
      case "GENERATE_PAYSLIPS": {
        const result = await generatePayslips(scope, periodId(proposal.payload));
        message = `${result.created} payslip berhasil dibuat.`;
        break;
      }
      case "OPEN_ADMIN_MODULE":
        refreshDashboard = false;
        message = "Modul admin siap dibuka sebagai fallback operasional.";
        break;
      default:
        throw new Error("Aksi IDA tidak didukung");
    }

    const response: IdaExecuteResponse = {
      ok: true,
      message,
      refreshDashboard,
      adminHref,
    };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Aksi IDA gagal dijalankan" },
      { status: 400 },
    );
  }
}
