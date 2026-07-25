"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import {
  buildTemplateWorkbook,
  checksumBuffer,
  parseImportExcel,
} from "@/lib/import/excel";
import { validateRows } from "@/lib/import/validate";
export async function downloadImportTemplate(code: string) {
  await requireSession();
  const buf = await buildTemplateWorkbook(code);
  return {
    fileName: `ProQPay_${code}_v1.xlsx`,
    base64: buf.toString("base64"),
  };
}

export async function uploadImportBatch(input: {
  templateCode: string;
  fileName: string;
  base64: string;
  companyId?: string | null;
}) {
  const scope = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: scope.userId } });
  const buffer = Buffer.from(input.base64, "base64");
  const checksum = checksumBuffer(buffer);

  const dup = await prisma.importBatch.findFirst({
    where: {
      fileChecksum: checksum,
      templateCode: input.templateCode,
      status: { in: ["UPLOADED", "VALIDATED", "COMMITTED"] },
    },
  });
  if (dup) {
    return {
      ok: false as const,
      error: "File yang sama sudah pernah diunggah (checksum duplikat).",
      batchId: dup.id,
    };
  }

  const { template, rows } = await parseImportExcel(buffer, input.templateCode);

  const employees = await prisma.employee.findMany({
    select: { employeeCode: true, bankAccount: true },
    take: 5000,
  });
  const projects = await prisma.project.findMany({
    select: { code: true },
    take: 2000,
  });

  const validated = validateRows(template, rows, {
    existingEmployeeCodes: new Set(employees.map((e) => e.employeeCode)),
    projectCodes: new Set(projects.map((p) => p.code)),
    bankAccounts: new Set(employees.map((e) => e.bankAccount)),
  });

  const validRows = validated.filter((r) => r.status === "VALID").length;
  const errorRows = validated.filter((r) => r.status === "ERROR").length;
  const warningRows = validated.filter((r) => r.status === "WARNING").length;

  const batchId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.importBatch.create({
      data: {
        id: batchId,
        companyId: input.companyId ?? scope.companyId ?? null,
        templateCode: input.templateCode,
        templateVersion: template.version,
        fileName: input.fileName,
        fileChecksum: checksum,
        status: "VALIDATED",
        totalRows: validated.length,
        validRows,
        errorRows,
        warningRows,
        uploadedBy: scope.userId,
      },
    });
    for (const row of validated) {
      await tx.importStagingRow.create({
        data: {
          id: randomUUID(),
          batchId,
          rowNumber: row.rowNumber,
          rawJson: row.data,
          status: row.status,
          errorsJson: row.errors,
          warningsJson: row.warnings,
        },
      });
      for (const err of row.errors) {
        await tx.importValidationResult.create({
          data: {
            id: randomUUID(),
            batchId,
            severity: "ERROR",
            message: `Baris ${row.rowNumber}: ${err}`,
          },
        });
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId: input.companyId ?? scope.companyId ?? null,
      userId: scope.userId,
      userName: user?.name ?? "User",
      userRole: scope.role,
      action: "IMPORT_UPLOAD",
      entity: "ImportBatch",
      entityId: batchId,
      detail: `${input.templateCode} · ${validated.length} baris`,
      ip: "app",
    },
  });

  return {
    ok: true as const,
    batchId,
    totalRows: validated.length,
    validRows,
    errorRows,
    warningRows,
  };
}

export async function commitImportBatch(batchId: string) {
  const scope = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: scope.userId } });
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { stagingRows: true },
  });
  if (!batch) return { ok: false as const, error: "Batch tidak ditemukan" };
  if (batch.status === "COMMITTED") {
    return { ok: false as const, error: "Batch sudah di-commit" };
  }

  const commitable = batch.stagingRows.filter(
    (r) => r.status === "VALID" || r.status === "WARNING",
  );
  if (!commitable.length) {
    return { ok: false as const, error: "Tidak ada baris valid untuk di-commit" };
  }

  const companyId =
    batch.companyId ??
    scope.companyId ??
    (
      await prisma.company.findFirst({ orderBy: { createdAt: "asc" } })
    )?.id;

  if (!companyId) {
    return { ok: false as const, error: "Client/perusahaan belum tersedia" };
  }

  let committed = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (const row of commitable) {
        const data = row.rawJson as Record<string, string>;
        if (batch.templateCode === "EMPLOYEE_MASTER") {
          const id = randomUUID();
          await tx.employee.create({
            data: {
              id,
              companyId,
              employeeCode: data.employee_code,
              name: data.name,
              email: data.email,
              phone: data.phone || "-",
              department: data.department,
              position: data.position,
              joinDate: new Date(data.join_date),
              baseSalary: Number(String(data.base_salary).replace(/[^\d.-]/g, "")),
              bankName: data.bank_name,
              bankAccount: data.bank_account,
              taxStatus: data.tax_status || "TK/0",
              bpjsNumber: data.bpjs_number || "-",
              npwp: data.npwp || "-",
              status: "ACTIVE",
            },
          });
          await tx.importCommitLog.create({
            data: {
              id: randomUUID(),
              batchId,
              stagingRowId: row.id,
              action: "CREATE",
              entity: "Employee",
              entityId: id,
            },
          });
          await tx.importStagingRow.update({
            where: { id: row.id },
            data: { status: "COMMITTED" },
          });
          committed++;
        } else if (batch.templateCode === "BANK_ACCOUNT") {
          const emp = await tx.employee.findFirst({
            where: { employeeCode: data.employee_code, companyId },
          });
          if (!emp) continue;
          await tx.employee.update({
            where: { id: emp.id },
            data: {
              bankName: data.bank_name,
              bankAccount: data.bank_account,
            },
          });
          await tx.importCommitLog.create({
            data: {
              id: randomUUID(),
              batchId,
              stagingRowId: row.id,
              action: "UPDATE",
              entity: "Employee.bank",
              entityId: emp.id,
            },
          });
          await tx.importStagingRow.update({
            where: { id: row.id },
            data: { status: "COMMITTED" },
          });
          committed++;
        } else if (batch.templateCode === "COMPENSATION") {
          const emp = await tx.employee.findFirst({
            where: { employeeCode: data.employee_code, companyId },
          });
          if (!emp) continue;
          await tx.employee.update({
            where: { id: emp.id },
            data: {
              baseSalary: Number(String(data.base_salary).replace(/[^\d.-]/g, "")),
            },
          });
          await tx.importCommitLog.create({
            data: {
              id: randomUUID(),
              batchId,
              stagingRowId: row.id,
              action: "UPDATE",
              entity: "Employee.compensation",
              entityId: emp.id,
            },
          });
          await tx.importStagingRow.update({
            where: { id: row.id },
            data: { status: "COMMITTED" },
          });
          committed++;
        } else if (batch.templateCode === "EMPLOYEE_TERMINATION") {
          const emp = await tx.employee.findFirst({
            where: { employeeCode: data.employee_code, companyId },
          });
          if (!emp) continue;
          await tx.employee.update({
            where: { id: emp.id },
            data: {
              status: "TERMINATED",
              terminateDate: new Date(data.terminate_date),
            },
          });
          await tx.importCommitLog.create({
            data: {
              id: randomUUID(),
              batchId,
              stagingRowId: row.id,
              action: "TERMINATE",
              entity: "Employee",
              entityId: emp.id,
            },
          });
          await tx.importStagingRow.update({
            where: { id: row.id },
            data: { status: "COMMITTED" },
          });
          committed++;
        } else if (batch.templateCode === "PROJECT_ASSIGNMENT") {
          const emp = await tx.employee.findFirst({
            where: { employeeCode: data.employee_code, companyId },
          });
          const project = await tx.project.findFirst({
            where: { code: data.project_code, companyId },
          });
          if (!emp || !project) continue;
          await tx.projectAssignment.create({
            data: {
              id: randomUUID(),
              projectId: project.id,
              employeeId: emp.id,
              roleLabel: data.role_label || null,
              startDate: new Date(data.start_date),
              endDate: data.end_date ? new Date(data.end_date) : null,
              isActive: true,
            },
          });
          await tx.importStagingRow.update({
            where: { id: row.id },
            data: { status: "COMMITTED" },
          });
          committed++;
        } else {
          // Other templates: mark committed with log only (profile extensions)
          await tx.importCommitLog.create({
            data: {
              id: randomUUID(),
              batchId,
              stagingRowId: row.id,
              action: "STAGE_ACK",
              entity: batch.templateCode,
              detail: "Data divalidasi; commit domain penuh mengikuti master terkait",
            },
          });
          await tx.importStagingRow.update({
            where: { id: row.id },
            data: { status: "COMMITTED" },
          });
          committed++;
        }
      }

      await tx.importBatch.update({
        where: { id: batchId },
        data: {
          status: "COMMITTED",
          committedRows: committed,
          committedBy: scope.userId,
          committedAt: new Date(),
        },
      });
    });
  } catch {
    return {
      ok: false as const,
      error: "Commit gagal. Perubahan batch dibatalkan. Periksa data dan coba lagi.",
    };
  }

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId,
      userId: scope.userId,
      userName: user?.name ?? "User",
      userRole: scope.role,
      action: "IMPORT_COMMIT",
      entity: "ImportBatch",
      entityId: batchId,
      detail: `${committed} baris`,
      ip: "app",
    },
  });

  return { ok: true as const, committed };
}

export async function getImportBatchDetail(batchId: string) {
  await requireSession();
  return prisma.importBatch.findUnique({
    where: { id: batchId },
    include: {
      stagingRows: { orderBy: { rowNumber: "asc" }, take: 500 },
      validationResults: { take: 200 },
    },
  });
}

export async function listImportBatches() {
  await requireSession();
  return prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listImportTemplateMeta() {
  return (await import("@/lib/import/templates")).IMPORT_TEMPLATES;
}
