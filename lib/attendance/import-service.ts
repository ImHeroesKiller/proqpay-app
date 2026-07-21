/**
 * Attendance CSV import, staging, validation, exception queue (Increment 1).
 */

import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";
import type { AttendanceType } from "@prisma/client";

const ATTENDANCE_TYPES = new Set([
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
  "SICK",
  "PERMISSION",
  "OVERTIME",
  "HOLIDAY",
]);

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row");
  }
  const headers = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!);
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

export function checksumContent(text: string): string {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  return createHash("sha256").update(normalized).digest("hex");
}

function pick(row: CsvRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k.toLowerCase()];
    if (v != null && v !== "") return v;
  }
  return "";
}

/**
 * Import attendance CSV for a company (optionally bound to payroll period).
 * Valid rows → staging; errors → exception queue.
 * Same contentChecksum re-import returns existing batch (idempotent).
 * Commit writes staging → attendance_records (upsert by employee+date).
 */
export async function importAttendanceCsv(
  scope: SessionScope,
  input: {
    companyId: string;
    payrollPeriodId?: string | null;
    fileName: string;
    csvText: string;
    autoCommit?: boolean;
  },
) {
  if (!assertCompanyAccess(scope, input.companyId)) {
    throw new Error("Cross-company access denied");
  }

  let period = null;
  if (input.payrollPeriodId) {
    period = await prisma.payrollPeriod.findUnique({
      where: { id: input.payrollPeriodId },
    });
    if (!period) throw new Error("Payroll period not found");
    if (period.companyId !== input.companyId) {
      throw new Error("Period does not belong to company");
    }
    if (["LOCKED", "CLOSED"].includes(period.status)) {
      throw new Error("Cannot import attendance into locked/closed period");
    }
  }

  const checksum = checksumContent(input.csvText);
  const existing = await prisma.attendanceImportBatch.findUnique({
    where: {
      companyId_contentChecksum: {
        companyId: input.companyId,
        contentChecksum: checksum,
      },
    },
    include: {
      _count: { select: { exceptions: true, stagingRows: true } },
    },
  });
  if (existing) {
    return {
      batch: existing,
      idempotent: true,
      message: "Identical file already imported — returning existing batch",
    };
  }

  const { rows } = parseCsv(input.csvText);
  const batchId = randomUUID();

  // Preload employees by code for company
  const employees = await prisma.employee.findMany({
    where: { companyId: input.companyId },
    select: {
      id: true,
      employeeCode: true,
      status: true,
    },
  });
  const byCode = new Map(
    employees.map((e) => [e.employeeCode.toUpperCase(), e]),
  );

  // Active assignments if period has group
  let assignmentEmpIds: Set<string> | null = null;
  if (period?.payrollGroupId) {
    const asg = await prisma.employeePayrollAssignment.findMany({
      where: {
        payrollGroupId: period.payrollGroupId,
        status: "ACTIVE",
        effectiveFrom: { lte: period.periodEnd },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodStart } }],
      },
      select: { employeeId: true },
    });
    assignmentEmpIds = new Set(asg.map((a) => a.employeeId));
  }

  const projectCodes = await prisma.project.findMany({
    where: { companyId: input.companyId },
    select: { id: true, code: true },
  });
  const projectByCode = new Map(
    projectCodes.map((p) => [p.code.toUpperCase(), p.id]),
  );

  const sites = await prisma.site.findMany({
    where: { companyId: input.companyId },
    select: { code: true, status: true },
  });
  const siteByCode = new Map(sites.map((s) => [s.code.toUpperCase(), s]));

  type Stage = {
    rowNumber: number;
    employeeId: string;
    employeeCode: string;
    workDate: Date;
    type: AttendanceType;
    hoursWorked: number;
    overtimeHours: number;
    projectId: string | null;
    siteCode: string | null;
    notes: string | null;
  };
  type Exc = {
    rowNumber: number;
    code: string;
    message: string;
    severity: "ERROR" | "WARNING";
    employeeCode: string | null;
    workDate: string | null;
    rawPayload: string;
  };

  const staged: Stage[] = [];
  const exceptions: Exc[] = [];
  const seenKeys = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // 1-based + header
    const rawPayload = JSON.stringify(row);
    const employeeCode = pick(row, "employee_code", "employeecode", "code", "nik");
    const workDateStr = pick(row, "work_date", "date", "workdate");
    const typeStr = (pick(row, "type", "attendance_type", "status") || "PRESENT").toUpperCase();
    const hoursStr = pick(row, "hours_worked", "hours", "hoursworked") || "8";
    const otStr = pick(row, "overtime_hours", "overtime", "ot") || "0";
    const projectCode = pick(row, "project_code", "project");
    const siteCode = pick(row, "site_code", "site");
    const notes = pick(row, "notes", "note") || null;

    if (!employeeCode || !workDateStr) {
      exceptions.push({
        rowNumber,
        code: "MANDATORY_FIELD",
        message: "employee_code and work_date are required",
        severity: "ERROR",
        employeeCode: employeeCode || null,
        workDate: workDateStr || null,
        rawPayload,
      });
      return;
    }

    const emp = byCode.get(employeeCode.toUpperCase());
    if (!emp) {
      exceptions.push({
        rowNumber,
        code: "EMPLOYEE_NOT_FOUND",
        message: `Employee code ${employeeCode} not found in company`,
        severity: "ERROR",
        employeeCode,
        workDate: workDateStr,
        rawPayload,
      });
      return;
    }

    const workDate = parseDate(workDateStr);
    if (!workDate) {
      exceptions.push({
        rowNumber,
        code: "INVALID_DATE",
        message: `Invalid work_date: ${workDateStr}`,
        severity: "ERROR",
        employeeCode,
        workDate: workDateStr,
        rawPayload,
      });
      return;
    }

    if (period) {
      if (workDate < period.periodStart || workDate > period.periodEnd) {
        exceptions.push({
          rowNumber,
          code: "DATE_OUT_OF_PERIOD",
          message: `work_date outside period ${period.periodStart.toISOString().slice(0, 10)} – ${period.periodEnd.toISOString().slice(0, 10)}`,
          severity: "ERROR",
          employeeCode,
          workDate: workDateStr,
          rawPayload,
        });
        return;
      }
    }

    if (assignmentEmpIds && !assignmentEmpIds.has(emp.id)) {
      exceptions.push({
        rowNumber,
        code: "ASSIGNMENT_INVALID",
        message: `Employee ${employeeCode} is not in the period payroll group population`,
        severity: "ERROR",
        employeeCode,
        workDate: workDateStr,
        rawPayload,
      });
      return;
    }

    if (!ATTENDANCE_TYPES.has(typeStr)) {
      exceptions.push({
        rowNumber,
        code: "INVALID_TYPE",
        message: `Unknown attendance type ${typeStr}`,
        severity: "ERROR",
        employeeCode,
        workDate: workDateStr,
        rawPayload,
      });
      return;
    }

    const hoursWorked = Number(hoursStr);
    const overtimeHours = Number(otStr);
    if (!Number.isFinite(hoursWorked) || hoursWorked < 0 || hoursWorked > 24) {
      exceptions.push({
        rowNumber,
        code: "INVALID_HOURS",
        message: `hours_worked invalid: ${hoursStr}`,
        severity: "ERROR",
        employeeCode,
        workDate: workDateStr,
        rawPayload,
      });
      return;
    }
    if (!Number.isFinite(overtimeHours) || overtimeHours < 0 || overtimeHours > 24) {
      exceptions.push({
        rowNumber,
        code: "INVALID_OT",
        message: `overtime_hours invalid: ${otStr}`,
        severity: "ERROR",
        employeeCode,
        workDate: workDateStr,
        rawPayload,
      });
      return;
    }

    let projectId: string | null = null;
    if (projectCode) {
      projectId = projectByCode.get(projectCode.toUpperCase()) ?? null;
      if (!projectId) {
        exceptions.push({
          rowNumber,
          code: "PROJECT_INVALID",
          message: `Project code ${projectCode} not found`,
          severity: "ERROR",
          employeeCode,
          workDate: workDateStr,
          rawPayload,
        });
        return;
      }
    }

    if (siteCode) {
      const site = siteByCode.get(siteCode.toUpperCase());
      if (!site) {
        exceptions.push({
          rowNumber,
          code: "SITE_INVALID",
          message: `Site code ${siteCode} not found`,
          severity: "ERROR",
          employeeCode,
          workDate: workDateStr,
          rawPayload,
        });
        return;
      }
      if (site.status !== "ACTIVE") {
        exceptions.push({
          rowNumber,
          code: "SITE_INACTIVE",
          message: `Site ${siteCode} is inactive`,
          severity: "WARNING",
          employeeCode,
          workDate: workDateStr,
          rawPayload,
        });
      }
    }

    const dupKey = `${emp.id}|${workDate.toISOString().slice(0, 10)}`;
    if (seenKeys.has(dupKey)) {
      exceptions.push({
        rowNumber,
        code: "DUPLICATE_IN_FILE",
        message: `Duplicate employee+date in file: ${employeeCode} ${workDateStr}`,
        severity: "ERROR",
        employeeCode,
        workDate: workDateStr,
        rawPayload,
      });
      return;
    }
    seenKeys.add(dupKey);

    staged.push({
      rowNumber,
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      workDate,
      type: typeStr as AttendanceType,
      hoursWorked,
      overtimeHours,
      projectId,
      siteCode: siteCode || null,
      notes,
    });
  });

  const errorCount = exceptions.filter((e) => e.severity === "ERROR").length;
  const status =
    staged.length === 0
      ? "FAILED"
      : errorCount > 0
        ? "PARTIAL"
        : "STAGED";

  await prisma.$transaction(async (tx) => {
    await tx.attendanceImportBatch.create({
      data: {
        id: batchId,
        companyId: input.companyId,
        payrollPeriodId: input.payrollPeriodId ?? null,
        fileName: input.fileName,
        contentChecksum: checksum,
        status,
        totalRows: rows.length,
        successRows: staged.length,
        exceptionRows: exceptions.length,
        stagedRows: staged.length,
        createdById: scope.userId,
      },
    });
    if (staged.length) {
      await tx.attendanceStagingRow.createMany({
        data: staged.map((s) => ({
          id: randomUUID(),
          batchId,
          rowNumber: s.rowNumber,
          employeeId: s.employeeId,
          employeeCode: s.employeeCode,
          workDate: s.workDate,
          type: s.type,
          hoursWorked: s.hoursWorked,
          overtimeHours: s.overtimeHours,
          projectId: s.projectId,
          siteCode: s.siteCode,
          notes: s.notes,
        })),
      });
    }
    if (exceptions.length) {
      await tx.attendanceImportException.createMany({
        data: exceptions.map((e) => ({
          id: randomUUID(),
          batchId,
          rowNumber: e.rowNumber,
          code: e.code,
          message: e.message,
          severity: e.severity,
          status: "OPEN",
          employeeCode: e.employeeCode,
          workDate: e.workDate,
          rawPayload: e.rawPayload,
        })),
      });
    }
  });

  let committed = null;
  if (input.autoCommit !== false && staged.length > 0) {
    committed = await commitAttendanceBatch(scope, batchId);
  }

  const batch = await prisma.attendanceImportBatch.findUnique({
    where: { id: batchId },
  });
  return { batch, idempotent: false, committed, exceptions: exceptions.length };
}

function parseDate(s: string): Date | null {
  // YYYY-MM-DD or DD/MM/YYYY
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`);
  }
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const dd = dmy[1]!.padStart(2, "0");
    const mm = dmy[2]!.padStart(2, "0");
    return new Date(`${dmy[3]}-${mm}-${dd}T00:00:00.000Z`);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function commitAttendanceBatch(
  scope: SessionScope,
  batchId: string,
) {
  const batch = await prisma.attendanceImportBatch.findUnique({
    where: { id: batchId },
    include: { stagingRows: true },
  });
  if (!batch) throw new Error("Import batch not found");
  if (!assertCompanyAccess(scope, batch.companyId)) {
    throw new Error("Cross-company access denied");
  }
  if (batch.status === "COMMITTED") {
    return { batchId, alreadyCommitted: true, upserted: 0 };
  }
  if (!batch.stagingRows.length) {
    throw new Error("No staged rows to commit");
  }

  let upserted = 0;
  const openErrors = await prisma.attendanceImportException.count({
    where: { batchId, status: "OPEN", severity: "ERROR" },
  });

  await prisma.$transaction(async (tx) => {
    for (const s of batch.stagingRows) {
      await tx.attendanceRecord.upsert({
        where: {
          employeeId_workDate: {
            employeeId: s.employeeId,
            workDate: s.workDate,
          },
        },
        create: {
          companyId: batch.companyId,
          employeeId: s.employeeId,
          projectId: s.projectId,
          workDate: s.workDate,
          type: s.type,
          hoursWorked: s.hoursWorked,
          overtimeHours: s.overtimeHours,
          notes: s.notes,
          importBatchId: batchId,
        },
        update: {
          type: s.type,
          hoursWorked: s.hoursWorked,
          overtimeHours: s.overtimeHours,
          projectId: s.projectId,
          notes: s.notes,
          importBatchId: batchId,
          isLocked: false,
        },
      });
      upserted++;
    }
    await tx.attendanceImportBatch.update({
      where: { id: batchId },
      data: {
        status: openErrors > 0 ? "PARTIAL" : "COMMITTED",
        committedAt: new Date(),
      },
    });
  });

  return { batchId, alreadyCommitted: false, upserted };
}

export async function listExceptions(
  scope: SessionScope,
  opts: {
    companyId?: string;
    batchId?: string;
    payrollPeriodId?: string;
    status?: "OPEN" | "RESOLVED" | "IGNORED";
  },
) {
  const companyId = opts.companyId ?? scope.companyId ?? undefined;
  if (companyId && !assertCompanyAccess(scope, companyId)) {
    throw new Error("Cross-company access denied");
  }
  return prisma.attendanceImportException.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.batchId ? { batchId: opts.batchId } : {}),
      batch: {
        ...(companyId ? { companyId } : {}),
        ...(opts.payrollPeriodId
          ? { payrollPeriodId: opts.payrollPeriodId }
          : {}),
      },
    },
    orderBy: [{ status: "asc" }, { rowNumber: "asc" }],
    take: 200,
    include: {
      batch: { select: { id: true, fileName: true, payrollPeriodId: true } },
    },
  });
}

export async function resolveException(
  scope: SessionScope,
  exceptionId: string,
  action: "RESOLVED" | "IGNORED",
  note?: string,
) {
  const ex = await prisma.attendanceImportException.findUnique({
    where: { id: exceptionId },
    include: { batch: true },
  });
  if (!ex) throw new Error("Exception not found");
  if (!assertCompanyAccess(scope, ex.batch.companyId)) {
    throw new Error("Cross-company access denied");
  }
  if (ex.status !== "OPEN") throw new Error("Exception already closed");

  return prisma.attendanceImportException.update({
    where: { id: exceptionId },
    data: {
      status: action,
      resolvedAt: new Date(),
      resolvedById: scope.userId,
      resolutionNote: note ?? null,
    },
  });
}
