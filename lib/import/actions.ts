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

  if (!input.companyId && !scope.companyId) {
    return {
      ok: false as const,
      error: "Pilih client tujuan sebelum IDA memproses dan menyimpan batch.",
    };
  }
  const selectedCompanyId = input.companyId ?? scope.companyId!;
  const { template, rows, idaSummary, mappingSource } =
    await parseImportExcel(buffer, input.templateCode);
  const templateColumns = JSON.parse(JSON.stringify(template.columns));
  const existingTemplate = await prisma.importTemplate.findFirst({
    where: { companyId: null, code: input.templateCode, version: 1 },
    select: { id: true },
  });
  const templateMeta = existingTemplate ?? await prisma.importTemplate.create({
    data: {
      companyId: null,
      code: input.templateCode,
      name: template.name,
      entityType: input.templateCode,
      version: 1,
      columnSchema: templateColumns,
      columnsJson: templateColumns,
    },
  });

  const employees = await prisma.employee.findMany({
    where: { companyId: selectedCompanyId },
    select: { employeeCode: true, bankAccount: true },
    take: 5000,
  });
  const projects = await prisma.project.findMany({
    where: { companyId: selectedCompanyId },
    select: { code: true },
    take: 2000,
  });
  const selectedCompany = await prisma.company.findUnique({
    where: { id: selectedCompanyId },
    select: { id: true, name: true },
  });
  if (!selectedCompany) {
    return {
      ok: false as const,
      error: "Client tidak ditemukan. Tambahkan client baru melalui Settings > Clients.",
    };
  }
  const clientAliases = new Set([
    selectedCompany.id.toLowerCase(),
    selectedCompany.name.toLowerCase(),
    selectedCompany.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    selectedCompany.name
      .replace(/\b(pt|cv|tbk|persero)\b/gi, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toLowerCase(),
  ]);

  const validated = validateRows(template, rows, {
    existingEmployeeCodes: new Set(employees.map((e) => e.employeeCode)),
    projectCodes: new Set(projects.map((p) => p.code)),
    clientCodes: clientAliases,
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
        companyId: selectedCompanyId,
        templateId: templateMeta.id,
        templateCode: input.templateCode,
        templateVersion: String(template.version),
        fileName: input.fileName,
        fileChecksum: checksum,
        status: "VALIDATED",
        totalRows: validated.length,
        validRows,
        errorRows,
        warningRows,
        errorSummary: `[IDA:${mappingSource}] ${idaSummary}`,
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
    idaSummary,
    mappingSource,
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

export async function listImportCompanies() {
  const scope = await requireSession();
  return prisma.company.findMany({
    where:
      scope.role === "SUPER_ADMIN" ||
      (scope.role === "DIRECTOR" && !scope.companyId)
        ? scope.organizationId
          ? { organizationId: scope.organizationId }
          : {}
        : { id: scope.companyId ?? "00000000-0000-0000-0000-000000000000" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
