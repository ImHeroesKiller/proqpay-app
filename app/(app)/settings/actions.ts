"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

export async function updateMyProfile(formData: FormData) {
  const scope = await requireModule("settings");
  const name = String(formData.get("name") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  if (name.length < 2 || name.length > 120) throw new Error("Nama harus terdiri dari 2–120 karakter.");
  await prisma.user.update({ where: { id: scope.userId }, data: { name, department: department || null, avatarInitials: initials(name) } });
  revalidatePath("/settings");
}

export async function updateCompanySettings(formData: FormData) {
  const scope = await requireModule("settings");
  if (!["SUPER_ADMIN", "DIRECTOR"].includes(scope.role)) throw new Error("Hanya Super Admin atau Director yang dapat mengubah pengaturan perusahaan.");
  const companyId = String(formData.get("companyId") ?? "");
  const company = await prisma.company.findFirst({ where: { id: companyId, ...(scope.role === "SUPER_ADMIN" ? {} : { organizationId: scope.organizationId ?? undefined }) } });
  if (!company) throw new Error("Perusahaan tidak ditemukan.");
  const name = String(formData.get("name") ?? "").trim();
  const fundingModel = String(formData.get("defaultFundingModel") ?? "SELF_FUNDED");
  if (!name || !["SELF_FUNDED", "WORKING_CAPITAL"].includes(fundingModel)) throw new Error("Data pengaturan perusahaan tidak valid.");
  await prisma.company.update({ where: { id: company.id }, data: {
    name, legalName: String(formData.get("legalName") ?? "").trim() || null,
    npwp: String(formData.get("npwp") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    defaultFundingModel: fundingModel as "SELF_FUNDED" | "WORKING_CAPITAL",
    fundingEnabled: formData.get("fundingEnabled") === "on",
  } });
  revalidatePath("/settings");
}
