import { NextResponse } from "next/server";
import {
  ATTENDANCE_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import {
  commitAttendanceBatch,
  importAttendanceCsv,
} from "@/lib/attendance/import-service";
import { prisma } from "@/lib/db";
import { assertTenantOrThrow } from "@/lib/auth/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "attendance" });
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const periodId = url.searchParams.get("payrollPeriodId") ?? undefined;
  const companyId =
    url.searchParams.get("companyId") ?? gate.auth.companyId ?? undefined;

  const batches = await prisma.attendanceImportBatch.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(periodId ? { payrollPeriodId: periodId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      _count: { select: { exceptions: true, stagingRows: true } },
    },
  });
  return NextResponse.json({ batches });
}

export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "attendance",
    roles: ATTENDANCE_MUTATOR_ROLES,
  });
  if (!gate.ok) return gate.response;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const action = String(form.get("action") ?? "import");
      if (action === "commit") {
        const batchId = String(form.get("batchId") ?? "");
        if (!batchId) {
          return NextResponse.json({ error: "batchId required" }, { status: 400 });
        }
        const result = await commitAttendanceBatch(gate.auth, batchId);
        return NextResponse.json(result);
      }

      const file = form.get("file");
      const payrollPeriodId = form.get("payrollPeriodId")
        ? String(form.get("payrollPeriodId"))
        : null;
      let companyId = form.get("companyId")
        ? String(form.get("companyId"))
        : gate.auth.companyId;

      if (payrollPeriodId) {
        const period = await prisma.payrollPeriod.findUnique({
          where: { id: payrollPeriodId },
        });
        if (!period) {
          return NextResponse.json({ error: "Period not found" }, { status: 404 });
        }
        assertTenantOrThrow(gate.auth, period.companyId);
        companyId = period.companyId;
      }

      if (!companyId) {
        return NextResponse.json(
          { error: "companyId or payrollPeriodId required" },
          { status: 400 },
        );
      }
      assertTenantOrThrow(gate.auth, companyId);

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file required" }, { status: 400 });
      }
      const csvText = await file.text();
      const result = await importAttendanceCsv(gate.auth, {
        companyId,
        payrollPeriodId,
        fileName: file.name || "attendance.csv",
        csvText,
        autoCommit: form.get("autoCommit") !== "false",
      });
      return NextResponse.json(result, { status: 201 });
    }

    // JSON commit
    const body = (await req.json()) as {
      action?: string;
      batchId?: string;
    };
    if (body.action === "commit" && body.batchId) {
      const result = await commitAttendanceBatch(gate.auth, body.batchId);
      return NextResponse.json(result);
    }
    return NextResponse.json(
      { error: "Use multipart form with file, or action=commit" },
      { status: 400 },
    );
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
