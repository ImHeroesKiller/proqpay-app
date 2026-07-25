"use server";

import {
  ComponentCalcMethod,
  PayrollComponentKind,
  ProjectStatus,
} from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

const WRITE_ROLES = new Set([
  "SUPER_ADMIN",
  "DIRECTOR",
  "PAYROLL_ADMIN",
  "PAYROLL_OPERATOR",
  "HR",
]);

function text(form: FormData, key: string, max = 160) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function optional(form: FormData, key: string, max = 300) {
  const value = text(form, key, max);
  return value || null;
}

function bool(form: FormData, key: string) {
  return form.get(key) === "on" || form.get(key) === "true";
}

function numberValue(form: FormData, key: string, fallback = 0) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function assertWritable(role: string) {
  if (!WRITE_ROLES.has(role)) throw new Error("Anda tidak memiliki akses untuk mengubah master data.");
}

function assertCompany(scope: { role: string; companyId?: string | null }, companyId: string) {
  if (scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR" && scope.companyId !== companyId) {
    throw new Error("Client di luar scope akun.");
  }
}

function refresh() {
  revalidatePath("/master-data");
  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/payroll-components");
  revalidatePath("/payroll-groups");
  revalidatePath("/settings");
  revalidateTag("shell-options");
}

async function audit(scope: Awaited<ReturnType<typeof requireSession>>, action: string, entity: string, entityId: string, detail: string) {
  await prisma.auditLog.create({
    data: {
      companyId: scope.companyId ?? null,
      userId: scope.userId,
      userName: scope.userId,
      userRole: scope.role,
      action,
      entity,
      entityId,
      detail,
      ip: "server-action",
    },
  }).catch(() => undefined);
}

export async function saveMasterData(form: FormData) {
  const scope = await requireSession();
  assertWritable(scope.role);
  const entity = text(form, "entity", 40);
  const id = optional(form, "id", 80);

  try {
    if (entity === "client") {
      if (!scope.organizationId) throw new Error("Organization belum terpasang pada akun.");
      const data = {
        organizationId: scope.organizationId,
        name: text(form, "name"),
        legalName: optional(form, "legalName"),
        npwp: optional(form, "npwp"),
        industry: optional(form, "industry"),
        address: optional(form, "address", 500),
        lifecycleStatus: (text(form, "lifecycleStatus") || "ACTIVE") as any,
        defaultFundingModel: (text(form, "defaultFundingModel") || "SELF_FUNDED") as any,
        fundingEnabled: bool(form, "fundingEnabled"),
      };
      if (!data.name) throw new Error("Nama client wajib diisi.");
      if (id) {
        const current = await prisma.company.findUniqueOrThrow({ where: { id }, select: { id: true } });
        assertCompany(scope, current.id);
        await prisma.company.update({ where: { id }, data });
        await audit(scope, "UPDATE", "Company", id, `Updated client ${data.name}`);
      } else {
        if (!new Set(["SUPER_ADMIN", "DIRECTOR"]).has(scope.role)) throw new Error("Hanya Director/Super Admin dapat menambah client.");
        const row = await prisma.company.create({ data });
        await audit(scope, "CREATE", "Company", row.id, `Created client ${data.name}`);
      }
    } else if (entity === "project") {
      const companyId = text(form, "companyId", 80);
      assertCompany(scope, companyId);
      const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } });
      const data = {
        companyId,
        clientName: company.name,
        code: text(form, "code", 50).toUpperCase(),
        name: text(form, "name"),
        site: optional(form, "site"),
        location: optional(form, "location"),
        contractRef: optional(form, "contractRef"),
        status: (text(form, "status") || "ACTIVE") as ProjectStatus,
        serviceType: optional(form, "serviceType"),
        operationalPic: optional(form, "operationalPic"),
        headcountQuota: Math.max(0, Math.trunc(numberValue(form, "headcountQuota", 0))) || null,
        projectBudget: numberValue(form, "projectBudget", 0) || null,
      };
      if (!data.code || !data.name) throw new Error("Kode dan nama project wajib diisi.");
      if (id) {
        await prisma.project.update({ where: { id }, data });
        await audit(scope, "UPDATE", "Project", id, `Updated project ${data.code}`);
      } else {
        const row = await prisma.project.create({ data });
        await audit(scope, "CREATE", "Project", row.id, `Created project ${data.code}`);
      }
    } else if (entity === "payrollGroup") {
      const companyId = text(form, "companyId", 80);
      assertCompany(scope, companyId);
      const data = {
        companyId,
        projectId: optional(form, "projectId", 80),
        code: text(form, "code", 50).toUpperCase(),
        name: text(form, "name"),
        workerType: text(form, "workerType", 40) || "MONTHLY",
        payCycle: text(form, "payCycle", 40) || "MONTHLY",
        isActive: bool(form, "isActive"),
      };
      if (!data.code || !data.name) throw new Error("Kode dan nama payroll group wajib diisi.");
      if (id) {
        await prisma.payrollGroup.update({ where: { id }, data });
        await audit(scope, "UPDATE", "PayrollGroup", id, `Updated payroll group ${data.code}`);
      } else {
        const row = await prisma.payrollGroup.create({ data });
        await audit(scope, "CREATE", "PayrollGroup", row.id, `Created payroll group ${data.code}`);
      }
    } else if (entity === "payrollComponent") {
      const companyId = text(form, "companyId", 80);
      assertCompany(scope, companyId);
      const data = {
        companyId,
        code: text(form, "code", 50).toUpperCase(),
        name: text(form, "name"),
        kind: (text(form, "kind") || "ALLOWANCE") as PayrollComponentKind,
        calcMethod: (text(form, "calcMethod") || "FIXED") as ComponentCalcMethod,
        defaultAmount: numberValue(form, "defaultAmount", 0),
        percentRate: optional(form, "percentRate") ? numberValue(form, "percentRate", 0) : null,
        isTaxable: bool(form, "isTaxable"),
        isActive: bool(form, "isActive"),
        sortOrder: Math.trunc(numberValue(form, "sortOrder", 0)),
      };
      if (!data.code || !data.name) throw new Error("Kode dan nama komponen wajib diisi.");
      if (id) {
        await prisma.payrollComponent.update({ where: { id }, data });
        await audit(scope, "UPDATE", "PayrollComponent", id, `Updated component ${data.code}`);
      } else {
        const row = await prisma.payrollComponent.create({ data });
        await audit(scope, "CREATE", "PayrollComponent", row.id, `Created component ${data.code}`);
      }
    } else if (["branch", "department", "position", "costCenter"].includes(entity)) {
      const companyId = text(form, "companyId", 80);
      assertCompany(scope, companyId);
      const data = {
        companyId,
        code: text(form, "code", 50).toUpperCase(),
        name: text(form, "name"),
        isActive: bool(form, "isActive"),
      };
      if (!data.code || !data.name) throw new Error("Kode dan nama wajib diisi.");
      const model = entity === "branch" ? prisma.branch : entity === "department" ? prisma.department : entity === "position" ? prisma.position : prisma.costCenter;
      if (id) await (model as any).update({ where: { id }, data });
      else await (model as any).create({ data });
      await audit(scope, id ? "UPDATE" : "CREATE", entity, id ?? data.code, `${id ? "Updated" : "Created"} ${entity} ${data.code}`);
    } else {
      throw new Error("Jenis master data tidak dikenali.");
    }

    refresh();
    redirect(`/master-data?entity=${encodeURIComponent(entity)}&success=1`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan data.";
    redirect(`/master-data?entity=${encodeURIComponent(entity)}&error=${encodeURIComponent(message)}`);
  }
}

export async function deleteMasterData(form: FormData) {
  const scope = await requireSession();
  assertWritable(scope.role);
  const entity = text(form, "entity", 40);
  const id = text(form, "id", 80);
  if (!id) redirect(`/master-data?entity=${entity}&error=ID%20tidak%20valid`);

  try {
    if (entity === "client") {
      if (!new Set(["SUPER_ADMIN", "DIRECTOR"]).has(scope.role)) throw new Error("Hanya Director/Super Admin dapat menghapus client.");
      assertCompany(scope, id);
      await prisma.company.delete({ where: { id } });
    } else if (entity === "project") {
      const row = await prisma.project.findUniqueOrThrow({ where: { id }, select: { companyId: true } });
      assertCompany(scope, row.companyId);
      await prisma.project.delete({ where: { id } });
    } else if (entity === "payrollGroup") {
      const row = await prisma.payrollGroup.findUniqueOrThrow({ where: { id }, select: { companyId: true } });
      assertCompany(scope, row.companyId);
      await prisma.payrollGroup.delete({ where: { id } });
    } else if (entity === "payrollComponent") {
      const row = await prisma.payrollComponent.findUniqueOrThrow({ where: { id }, select: { companyId: true } });
      assertCompany(scope, row.companyId);
      await prisma.payrollComponent.delete({ where: { id } });
    } else if (entity === "branch") await prisma.branch.delete({ where: { id } });
    else if (entity === "department") await prisma.department.delete({ where: { id } });
    else if (entity === "position") await prisma.position.delete({ where: { id } });
    else if (entity === "costCenter") await prisma.costCenter.delete({ where: { id } });
    else throw new Error("Jenis master data tidak dikenali.");

    await audit(scope, "DELETE", entity, id, `Deleted ${entity}`);
    refresh();
    redirect(`/master-data?entity=${encodeURIComponent(entity)}&deleted=1`);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Gagal menghapus data.";
    const message = raw.includes("Foreign key") || raw.includes("constraint")
      ? "Data masih dipakai oleh transaksi atau master lain. Nonaktifkan data atau lepaskan relasinya terlebih dahulu."
      : raw;
    redirect(`/master-data?entity=${encodeURIComponent(entity)}&error=${encodeURIComponent(message)}`);
  }
}
