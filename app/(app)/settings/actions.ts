"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

const roles = ["SUPER_ADMIN", "DIRECTOR", "PAYROLL_ADMIN", "PAYROLL_OPERATOR", "FINANCE", "HR", "APPROVER", "AUDITOR", "VIEWER"] as const;
const bankPurposes = ["CLIENT_PAYROLL_SOURCE", "PROQPAY_OPERATIONAL", "FUNDING_SOURCE", "SETTLEMENT", "COLLECTION", "OTHER"] as const;

async function settingsAdmin() {
  const scope = await requireModule("settings");
  if (!["SUPER_ADMIN", "DIRECTOR"].includes(scope.role)) throw new Error("Hanya Super Admin atau Director yang dapat mengubah pengaturan.");
  if (!scope.organizationId) throw new Error("Organisasi pengguna tidak ditemukan.");
  return scope;
}

async function scopedCompany(companyId: string) {
  const scope = await settingsAdmin();
  const company = await prisma.company.findFirst({ where: { id: companyId, organizationId: scope.organizationId } });
  if (!company) throw new Error("Perusahaan tidak ditemukan.");
  return { scope, company };
}

function clean(value: FormDataEntryValue | null, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function refreshSettings() { revalidatePath("/settings"); }

export async function updateMyProfile(formData: FormData) {
  const scope = await requireModule("settings");
  const name = String(formData.get("name") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  if (name.length < 2 || name.length > 120) throw new Error("Nama harus terdiri dari 2–120 karakter.");
  await prisma.user.update({ where: { id: scope.userId }, data: { name, department: department || null, avatarInitials: initials(name) } });
  revalidatePath("/settings");
}

export async function updateCompanySettings(formData: FormData) {
  const { company } = await scopedCompany(clean(formData.get("companyId"), 64));
  const name = clean(formData.get("name"));
  const fundingModel = clean(formData.get("defaultFundingModel"), 32);
  const payDay = Number(formData.get("payDay"));
  const currency = clean(formData.get("currency"), 3).toUpperCase();
  if (!name || !["SELF_FUNDED", "WORKING_CAPITAL"].includes(fundingModel) || !Number.isInteger(payDay) || payDay < 1 || payDay > 31 || !/^[A-Z]{3}$/.test(currency)) throw new Error("Data pengaturan perusahaan tidak valid.");
  await prisma.company.update({ where: { id: company.id }, data: {
    name, legalName: clean(formData.get("legalName")) || null,
    npwp: clean(formData.get("npwp"), 64) || null,
    address: clean(formData.get("address"), 500) || null,
    defaultFundingModel: fundingModel as "SELF_FUNDED" | "WORKING_CAPITAL",
    fundingEnabled: formData.get("fundingEnabled") === "on",
    payDay, currency,
  } });
  refreshSettings();
}

export async function saveApprovalRule(formData: FormData) {
  const { company } = await scopedCompany(clean(formData.get("companyId"), 64));
  const id = clean(formData.get("id"), 64);
  const name = clean(formData.get("name"));
  const level = Number(formData.get("level"));
  const role = clean(formData.get("role"), 32);
  if (!name || !Number.isInteger(level) || level < 1 || level > 10 || !roles.includes(role as (typeof roles)[number])) throw new Error("Aturan approval tidak valid.");
  if (id) {
    const existing = await prisma.approvalMatrix.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw new Error("Aturan approval tidak ditemukan.");
    await prisma.approvalMatrix.update({ where: { id }, data: { name, level, role: role as (typeof roles)[number], isActive: formData.get("isActive") === "on" } });
  } else {
    await prisma.approvalMatrix.create({ data: { companyId: company.id, name, level, role: role as (typeof roles)[number], isActive: true } });
  }
  refreshSettings();
}

export async function deleteApprovalRule(formData: FormData) {
  const { company } = await scopedCompany(clean(formData.get("companyId"), 64));
  const id = clean(formData.get("id"), 64);
  await prisma.approvalMatrix.deleteMany({ where: { id, companyId: company.id } });
  refreshSettings();
}

export async function saveBankAccount(formData: FormData) {
  const { company } = await scopedCompany(clean(formData.get("companyId"), 64));
  const id = clean(formData.get("id"), 64);
  const bank = clean(formData.get("bank")); const account = clean(formData.get("account"), 64);
  const label = clean(formData.get("label")); const purpose = clean(formData.get("purpose"), 32);
  if (!bank || !account || !label || !bankPurposes.includes(purpose as (typeof bankPurposes)[number])) throw new Error("Data rekening tidak valid.");
  const data = { bank, account, label, accountName: clean(formData.get("accountName")) || null, purpose: purpose as (typeof bankPurposes)[number], maskedAccountNumber: `****${account.slice(-4)}`, isPrimary: formData.get("isPrimary") === "on" };
  if (data.isPrimary) await prisma.bankAccount.updateMany({ where: { companyId: company.id }, data: { isPrimary: false } });
  if (id) await prisma.bankAccount.updateMany({ where: { id, companyId: company.id }, data }); else await prisma.bankAccount.create({ data: { ...data, companyId: company.id } });
  refreshSettings();
}

export async function deleteBankAccount(formData: FormData) {
  const { company } = await scopedCompany(clean(formData.get("companyId"), 64));
  const id = clean(formData.get("id"), 64);
  const inUse = await prisma.payrollPeriod.count({ where: { companyId: company.id, sourceBankAccountId: id } });
  if (inUse) throw new Error("Rekening masih dipakai periode payroll dan tidak dapat dihapus.");
  await prisma.bankAccount.deleteMany({ where: { id, companyId: company.id } });
  refreshSettings();
}

export async function saveUser(formData: FormData) {
  const scope = await settingsAdmin();
  const id = clean(formData.get("id"), 64); const name = clean(formData.get("name"));
  const email = clean(formData.get("email"), 180).toLowerCase(); const department = clean(formData.get("department"));
  const role = clean(formData.get("role"), 32);
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !roles.includes(role as (typeof roles)[number])) throw new Error("Data pengguna tidak valid.");
  if (id) {
    const user = await prisma.user.findFirst({ where: { id, organizationId: scope.organizationId } });
    if (!user) throw new Error("Pengguna tidak ditemukan.");
    if (user.id === scope.userId && role !== user.role) throw new Error("Anda tidak dapat mengubah peran akun sendiri.");
    await prisma.user.update({ where: { id }, data: { name, email, department: department || null, role: role as (typeof roles)[number], avatarInitials: initials(name) } });
  } else {
    const password = String(formData.get("password") ?? "");
    if (password.length < 10) throw new Error("Password awal minimal 10 karakter.");
    await prisma.user.create({ data: { organizationId: scope.organizationId, companyId: clean(formData.get("companyId"), 64) || null, name, email, department: department || null, role: role as (typeof roles)[number], avatarInitials: initials(name), passwordHash: await hash(password, 12) } });
  }
  refreshSettings();
}

export async function deleteUser(formData: FormData) {
  const scope = await settingsAdmin(); const id = clean(formData.get("id"), 64);
  if (id === scope.userId) throw new Error("Akun yang sedang digunakan tidak dapat dihapus.");
  const user = await prisma.user.findFirst({ where: { id, organizationId: scope.organizationId } });
  if (!user) throw new Error("Pengguna tidak ditemukan.");
  if (user.role === "SUPER_ADMIN" && await prisma.user.count({ where: { organizationId: scope.organizationId, role: "SUPER_ADMIN" } }) <= 1) throw new Error("Minimal satu Super Admin harus tetap aktif.");
  await prisma.user.delete({ where: { id } }); refreshSettings();
}
