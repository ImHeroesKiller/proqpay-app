/**
 * ProQPay realistic baseline reseed.
 *
 * Modes:
 *   pnpm seed:realistic -- --dry-run
 *   ALLOW_DATA_RESEED=true pnpm seed:realistic -- --execute
 *
 * Safety:
 *   - Requires ALLOW_DATA_RESEED=true for --execute
 *   - Refuses production-like hosts unless --confirm-production
 *   - Preserves operator login users (@msg-os.com)
 *   - No schema changes / no migrate reset
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PrismaClient,
  type EmploymentStatus,
  type Role,
  type SalesStage,
} from "@prisma/client";
import { hash } from "bcryptjs";

// ─── env loader ───────────────────────────────────────────
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const prisma = new PrismaClient();

function stableId(name: string): string {
  const hashHex = createHash("sha256")
    .update(`proqpay:baseline2026:${name}`)
    .digest("hex")
    .slice(0, 32);
  return [
    hashHex.slice(0, 8),
    hashHex.slice(8, 12),
    "5" + hashHex.slice(13, 16),
    "a" + hashHex.slice(17, 20),
    hashHex.slice(20, 32),
  ].join("-");
}

// ─── constants ────────────────────────────────────────────
const ORG_ID = stableId("org:msg");
const ATE_ID = stableId("company:ate");
const INT_ID = stableId("company:internal");
const MLS_ID = stableId("company:mls");
const QSG_ID = stableId("company:qsg");
const OGG_ID = stableId("company:ogg");

/** Dashboard "Total Payroll" uses PayrollPeriod.totalNet */
const ATE_JUNE_NET = 407_000_000;
const ATE_JULY_NET = 331_000_000;
const ATE_HISTORICAL_NET = ATE_JUNE_NET + ATE_JULY_NET; // 738_000_000
const PIPELINE_TOTAL = 4_200_000_000;

const OPERATOR_PASSWORD = process.env.OPERATOR_SEED_PASSWORD;
if (!OPERATOR_PASSWORD || OPERATOR_PASSWORD.length < 16) {
  throw new Error("OPERATOR_SEED_PASSWORD wajib diisi dan minimal 16 karakter.");
}

const PRESERVED_USERS: {
  email: string;
  name: string;
  role: Role;
  department: string;
  initials: string;
}[] = [
  {
    email: "admin@msg-os.com",
    name: "MSG Super Admin",
    role: "SUPER_ADMIN",
    department: "Executive Management",
    initials: "SA",
  },
  {
    email: "andi.wijaya@msg-os.com",
    name: "Andi Wijaya",
    role: "DIRECTOR",
    department: "Executive Management",
    initials: "AW",
  },
  {
    email: "siti.rahayu@msg-os.com",
    name: "Siti Rahayu",
    role: "PAYROLL_ADMIN",
    department: "Payroll Operations",
    initials: "SR",
  },
  {
    email: "budi.santoso@msg-os.com",
    name: "Budi Santoso",
    role: "FINANCE",
    department: "Finance",
    initials: "BS",
  },
  {
    email: "dewi.lestari@msg-os.com",
    name: "Dewi Lestari",
    role: "HR",
    department: "HR & General Affairs",
    initials: "DL",
  },
  {
    email: "rina.kusuma@msg-os.com",
    name: "Rina Kusuma",
    role: "APPROVER",
    department: "Finance Control",
    initials: "RK",
  },
];

const PRESERVED_EMAILS = new Set(PRESERVED_USERS.map((u) => u.email));

type EmpSeed = {
  code: string;
  name: string;
  position: string;
  department: string;
  baseSalary: number;
  status: EmploymentStatus;
  joinDate: string;
  contractType: string;
  june: boolean;
  july: boolean;
};

const ATE_EMPLOYEES: EmpSeed[] = [
  { code: "ATE-1001", name: "Aditya Pratama", position: "Project Lead", department: "Operations", baseSalary: 32_000_000, status: "ACTIVE", joinDate: "2024-01-15", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1002", name: "Rina Kartika Sari", position: "Operations Manager", department: "Operations", baseSalary: 28_000_000, status: "ACTIVE", joinDate: "2023-06-01", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1003", name: "Bagus Ramadhan", position: "Supervisor", department: "Operations", baseSalary: 18_000_000, status: "ACTIVE", joinDate: "2023-03-12", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1004", name: "Dimas Arya Putra", position: "Supervisor", department: "Operations", baseSalary: 16_500_000, status: "ACTIVE", joinDate: "2023-08-20", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1005", name: "Nadia Permatasari", position: "Finance Support", department: "Finance", baseSalary: 12_000_000, status: "ACTIVE", joinDate: "2024-02-01", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1006", name: "Fajar Nugroho", position: "Senior Staff", department: "Operations", baseSalary: 13_500_000, status: "ACTIVE", joinDate: "2022-11-10", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1007", name: "Siti Rahmawati", position: "Admin Support", department: "Admin", baseSalary: 8_500_000, status: "ACTIVE", joinDate: "2024-04-01", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1008", name: "Reza Maulana", position: "Technical Support", department: "IT", baseSalary: 11_000_000, status: "ACTIVE", joinDate: "2023-09-15", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1009", name: "Intan Maharani", position: "Admin Support", department: "Admin", baseSalary: 7_800_000, status: "ACTIVE", joinDate: "2024-05-20", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1010", name: "Yoga Prasetyo", position: "Staff Operational", department: "Operations", baseSalary: 7_500_000, status: "ACTIVE", joinDate: "2024-01-08", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1011", name: "Hendra Kurniawan", position: "Staff Operational", department: "Operations", baseSalary: 7_200_000, status: "ACTIVE", joinDate: "2023-12-01", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1012", name: "Dewi Lestari Putri", position: "Staff Operational", department: "Operations", baseSalary: 6_800_000, status: "ACTIVE", joinDate: "2024-03-11", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1013", name: "Andika Saputra", position: "Staff Operational", department: "Operations", baseSalary: 7_000_000, status: "ACTIVE", joinDate: "2024-02-19", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1014", name: "Putri Handayani", position: "Admin Support", department: "Admin", baseSalary: 7_500_000, status: "ACTIVE", joinDate: "2023-07-01", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1015", name: "Rizky Firmansyah", position: "Senior Staff", department: "Operations", baseSalary: 12_000_000, status: "ACTIVE", joinDate: "2022-05-16", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1016", name: "Nurul Hidayati", position: "Finance Support", department: "Finance", baseSalary: 9_500_000, status: "ACTIVE", joinDate: "2023-10-02", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1017", name: "Bayu Setiawan", position: "Staff Operational", department: "Operations", baseSalary: 6_500_000, status: "ACTIVE", joinDate: "2024-06-01", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1018", name: "Melati Anggraini", position: "Staff Operational", department: "Operations", baseSalary: 6_900_000, status: "ACTIVE", joinDate: "2024-01-22", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1019", name: "Farhan Akbar", position: "Technical Support", department: "IT", baseSalary: 10_500_000, status: "ACTIVE", joinDate: "2023-04-18", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1020", name: "Citra Wulandari", position: "Supervisor", department: "Operations", baseSalary: 15_500_000, status: "ACTIVE", joinDate: "2022-09-05", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1021", name: "Agung Wijaya", position: "Staff Operational", department: "Operations", baseSalary: 7_100_000, status: "ACTIVE", joinDate: "2023-11-14", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1022", name: "Lestari Cahya", position: "Admin Support", department: "Admin", baseSalary: 8_000_000, status: "ACTIVE", joinDate: "2024-03-01", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1023", name: "Eko Prasetyo", position: "Staff Operational", department: "Operations", baseSalary: 6_700_000, status: "ACTIVE", joinDate: "2024-04-15", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1024", name: "Wulan Sari", position: "Senior Staff", department: "Operations", baseSalary: 11_500_000, status: "ACTIVE", joinDate: "2023-01-09", contractType: "PERMANENT", june: true, july: true },
  { code: "ATE-1025", name: "Taufik Hidayat", position: "Staff Operational", department: "Operations", baseSalary: 7_300_000, status: "ACTIVE", joinDate: "2023-06-20", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1026", name: "Anisa Fitriani", position: "Admin Support", department: "Admin", baseSalary: 7_200_000, status: "PROBATION", joinDate: "2026-05-01", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1027", name: "Gilang Ramadhan", position: "Staff Operational", department: "Operations", baseSalary: 6_600_000, status: "ACTIVE", joinDate: "2024-07-08", contractType: "CONTRACT", june: true, july: true },
  { code: "ATE-1028", name: "Salsabila Nur", position: "Staff Operational", department: "Operations", baseSalary: 6_400_000, status: "ACTIVE", joinDate: "2024-08-12", contractType: "CONTRACT", june: true, july: true },
  // June-only (resigned after June)
  { code: "ATE-1029", name: "Budi Hartono", position: "Staff Operational", department: "Operations", baseSalary: 7_000_000, status: "RESIGNED", joinDate: "2023-02-01", contractType: "CONTRACT", june: true, july: false },
  { code: "ATE-1030", name: "Kartika Dewi", position: "Admin Support", department: "Admin", baseSalary: 7_400_000, status: "RESIGNED", joinDate: "2023-05-10", contractType: "CONTRACT", june: true, july: false },
  { code: "ATE-1031", name: "Joko Susilo", position: "Staff Operational", department: "Operations", baseSalary: 6_800_000, status: "RESIGNED", joinDate: "2024-01-15", contractType: "CONTRACT", june: true, july: false },
  { code: "ATE-1032", name: "Maya Safitri", position: "Staff Operational", department: "Operations", baseSalary: 6_500_000, status: "RESIGNED", joinDate: "2024-02-20", contractType: "CONTRACT", june: true, july: false },
  { code: "ATE-1033", name: "Rudi Hermawan", position: "Technical Support", department: "IT", baseSalary: 9_800_000, status: "RESIGNED", joinDate: "2022-08-01", contractType: "PERMANENT", june: true, july: false },
  { code: "ATE-1034", name: "Fitri Ayu Lestari", position: "Staff Operational", department: "Operations", baseSalary: 6_900_000, status: "RESIGNED", joinDate: "2023-09-01", contractType: "CONTRACT", june: true, july: false },
  // July new joiners
  { code: "ATE-1035", name: "Arif Maulana", position: "Staff Operational", department: "Operations", baseSalary: 7_000_000, status: "PROBATION", joinDate: "2026-07-01", contractType: "CONTRACT", june: false, july: true },
  { code: "ATE-1036", name: "Dian Puspita", position: "Admin Support", department: "Admin", baseSalary: 7_600_000, status: "PROBATION", joinDate: "2026-07-01", contractType: "CONTRACT", june: false, july: true },
];

const INTERNAL_EMPLOYEES: Omit<EmpSeed, "june" | "july">[] = [
  { code: "INT-2001", name: "Andi Wijaya", position: "Director", department: "Executive Management", baseSalary: 45_000_000, status: "ACTIVE", joinDate: "2020-01-01", contractType: "PERMANENT" },
  { code: "INT-2002", name: "Siti Rahayu", position: "Payroll Operations Manager", department: "Payroll Operations", baseSalary: 28_000_000, status: "ACTIVE", joinDate: "2021-03-01", contractType: "PERMANENT" },
  { code: "INT-2003", name: "Budi Santoso", position: "Finance Manager", department: "Finance", baseSalary: 30_000_000, status: "ACTIVE", joinDate: "2021-01-15", contractType: "PERMANENT" },
  { code: "INT-2004", name: "Dewi Lestari", position: "HR & GA Lead", department: "HR & General Affairs", baseSalary: 22_000_000, status: "ACTIVE", joinDate: "2021-06-01", contractType: "PERMANENT" },
  { code: "INT-2005", name: "Rina Kusuma", position: "Finance Control", department: "Finance", baseSalary: 20_000_000, status: "ACTIVE", joinDate: "2022-02-01", contractType: "PERMANENT" },
  { code: "INT-2006", name: "Teguh Santoso", position: "Head of Operations", department: "Operations", baseSalary: 35_000_000, status: "ACTIVE", joinDate: "2020-08-01", contractType: "PERMANENT" },
  { code: "INT-2007", name: "Mega Putri", position: "Payroll Specialist", department: "Payroll Operations", baseSalary: 14_000_000, status: "ACTIVE", joinDate: "2022-05-10", contractType: "PERMANENT" },
  { code: "INT-2008", name: "Irwan Setiawan", position: "Payroll Administrator", department: "Payroll Operations", baseSalary: 11_000_000, status: "ACTIVE", joinDate: "2023-01-20", contractType: "PERMANENT" },
  { code: "INT-2009", name: "Lina Marlina", position: "Finance Officer", department: "Finance", baseSalary: 12_000_000, status: "ACTIVE", joinDate: "2022-09-01", contractType: "PERMANENT" },
  { code: "INT-2010", name: "Faisal Rahman", position: "Business Development Manager", department: "Sales & Business Development", baseSalary: 26_000_000, status: "ACTIVE", joinDate: "2021-11-01", contractType: "PERMANENT" },
  { code: "INT-2011", name: "Ayu Sekar", position: "Enterprise Account Executive", department: "Sales & Business Development", baseSalary: 18_000_000, status: "ACTIVE", joinDate: "2023-03-15", contractType: "PERMANENT" },
  { code: "INT-2012", name: "Hana Kirana", position: "Client Success Manager", department: "Client Success", baseSalary: 17_000_000, status: "ACTIVE", joinDate: "2022-07-01", contractType: "PERMANENT" },
  { code: "INT-2013", name: "Doni Prasetya", position: "Compliance Officer", department: "Compliance", baseSalary: 16_000_000, status: "ACTIVE", joinDate: "2023-05-01", contractType: "PERMANENT" },
  { code: "INT-2014", name: "Vina Amelia", position: "Product Manager", department: "Product & Technology", baseSalary: 24_000_000, status: "ACTIVE", joinDate: "2022-04-01", contractType: "PERMANENT" },
  { code: "INT-2015", name: "Rafi Akbar", position: "Software Engineer", department: "Product & Technology", baseSalary: 20_000_000, status: "ACTIVE", joinDate: "2023-02-01", contractType: "PERMANENT" },
  { code: "INT-2016", name: "Nisa Rahmadani", position: "QA Engineer", department: "Product & Technology", baseSalary: 15_000_000, status: "ACTIVE", joinDate: "2023-08-01", contractType: "PERMANENT" },
  { code: "INT-2017", name: "Yusuf Mahendra", position: "Support Engineer", department: "Product & Technology", baseSalary: 14_000_000, status: "ACTIVE", joinDate: "2024-01-10", contractType: "PERMANENT" },
  { code: "INT-2018", name: "Clara Putri", position: "Data Analyst", department: "Product & Technology", baseSalary: 16_500_000, status: "ACTIVE", joinDate: "2023-10-01", contractType: "PERMANENT" },
];

// ─── CLI ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || !args.includes("--execute");
const EXECUTE = args.includes("--execute");
const CONFIRM_PRODUCTION = args.includes("--confirm-production");

function isProductionLike(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (process.env.VERCEL_ENV === "production") return true;
  if (app.includes("proqpay.msg-os.com") && !app.includes("localhost")) return true;
  if (process.env.NODE_ENV === "production" && !url.includes("localhost")) return true;
  return false;
}

function idr(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function emailSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function maskAccount(n: number) {
  return `•••• ${String(1000 + (n % 9000)).padStart(4, "0")}`;
}

type LineDraft = {
  employeeId: string;
  employeeName: string;
  department: string;
  baseSalary: number;
  allowances: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  tax: number;
  bpjs: number;
  netPay: number;
};

/** Build payroll lines that sum exactly to targetNet (Dashboard uses totalNet). */
function buildLinesExact(
  employees: { id: string; name: string; department: string; baseSalary: number }[],
  targetNet: number,
): LineDraft[] {
  const drafts: LineDraft[] = employees.map((e, idx) => {
    const base = e.baseSalary;
    const allowances = Math.round(base * 0.12) + (idx % 3) * 50_000;
    const overtime = idx % 4 === 0 ? 500_000 : idx % 5 === 0 ? 250_000 : 0;
    const bonuses = 0;
    const bpjs = Math.round(base * 0.03);
    const tax = Math.round(base * 0.05);
    const deductions = Math.round(base * 0.01);
    const netPay = base + allowances + overtime + bonuses - deductions - tax - bpjs;
    return {
      employeeId: e.id,
      employeeName: e.name,
      department: e.department,
      baseSalary: base,
      allowances,
      overtime,
      bonuses,
      deductions,
      tax,
      bpjs,
      netPay,
    };
  });

  const sum = drafts.reduce((s, d) => s + d.netPay, 0);
  const diff = targetNet - sum;
  // Adjust last line allowances so equation stays consistent
  const last = drafts[drafts.length - 1];
  last.allowances += diff;
  last.netPay += diff;

  const check = drafts.reduce((s, d) => s + d.netPay, 0);
  if (check !== targetNet) {
    throw new Error(`Payroll reconciliation failed: got ${check}, expected ${targetNet}`);
  }
  return drafts;
}

async function inventory() {
  return {
    organization: await prisma.organization.count(),
    company: await prisma.company.count(),
    user: await prisma.user.count(),
    employee: await prisma.employee.count(),
    payrollPeriod: await prisma.payrollPeriod.count(),
    payrollLine: await prisma.payrollLine.count(),
    project: await prisma.project.count(),
    salesOpportunity: await prisma.salesOpportunity.count(),
    paymentInstruction: await prisma.paymentInstruction.count(),
    paymentConfirmation: await prisma.paymentConfirmation.count(),
    disbursement: await prisma.disbursementBatch.count(),
    approvalStep: await prisma.approvalStep.count(),
    workingCapital: await prisma.workingCapitalRequest.count(),
    capitalPartner: await prisma.capitalPartner.count(),
    capitalAllocation: await prisma.capitalAllocation.count(),
    attendance: await prisma.attendanceRecord.count(),
    auditLog: await prisma.auditLog.count(),
    companies: await prisma.company.findMany({
      select: { id: true, name: true, lifecycleStatus: true, clientType: true },
    }),
  };
}

/** Destructive cleanup of operational data; preserves operator users + org shell. */
async function cleanupAll() {
  // Null user company refs so companies can be removed
  await prisma.user.updateMany({ data: { companyId: null } });

  // Child → parent
  await prisma.paymentConfirmationFile.deleteMany();
  await prisma.paymentConfirmation.deleteMany();
  await prisma.paymentInstructionItem.deleteMany();
  await prisma.paymentInstruction.deleteMany();
  await prisma.disbursementBatch.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.payrollLine.deleteMany();
  await prisma.capitalAllocation.deleteMany();
  await prisma.workingCapitalRequest.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.project.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.salesOpportunity.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.capitalPartner.deleteMany();
  await prisma.appNotification.deleteMany();
  await prisma.loginHistory.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.holidayCalendar.deleteMany();
  await prisma.approvalMatrix.deleteMany();
  await prisma.payrollComponent.deleteMany();
  await prisma.taxConfig.deleteMany();
  await prisma.bpjsConfig.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.position.deleteMany();
  await prisma.department.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.company.deleteMany();

  // Remove all users; operators are recreated with stable IDs
  await prisma.user.deleteMany();
}

async function seedBaseline() {
  const passwordHash = await hash(OPERATOR_PASSWORD, 10);

  // Reuse existing org row by slug when present (avoids unique slug clash after ID namespace change)
  const existingOrg = await prisma.organization.findFirst({
    where: { slug: "msg-technology" },
  });
  const orgId = existingOrg?.id ?? ORG_ID;
  await prisma.organization.upsert({
    where: { id: orgId },
    create: {
      id: orgId,
      name: "PT Mandiri Semesta Gemilang",
      slug: "msg-technology",
    },
    update: { name: "PT Mandiri Semesta Gemilang" },
  });

  // Companies
  await prisma.company.create({
    data: {
      id: ATE_ID,
      organizationId: orgId,
      name: "PT Anak Tiga Emas",
      legalName: "PT Anak Tiga Emas",
      npwp: "10.887.221.3-012.000",
      address: "Jakarta Selatan, DKI Jakarta",
      lifecycleStatus: "ACTIVE",
      clientType: "EXISTING",
      industry: "Business Services",
      employeeRange: "25-50",
      estimatedMonthlyPayroll: 350_000_000,
      actualManagedPayroll: ATE_HISTORICAL_NET,
      defaultFundingModel: "SELF_FUNDED",
      fundingEnabled: true,
      workingCapitalStatus: "NOT_ENABLED",
      goLiveDate: new Date("2026-06-01"),
      source: "baseline-2026",
      internalNotes: "Existing managed payroll client. Historical June–July 2026.",
    },
  });

  await prisma.company.create({
    data: {
      id: INT_ID,
      organizationId: orgId,
      name: "ProQPay Internal Operations",
      legalName: "PT Mandiri Semesta Gemilang — Internal",
      address: "Jakarta",
      lifecycleStatus: "ACTIVE",
      clientType: "INTERNAL",
      industry: "Technology",
      defaultFundingModel: "SELF_FUNDED",
      fundingEnabled: false,
      workingCapitalStatus: "NOT_ENABLED",
      source: "baseline-2026",
      internalNotes: "Internal MSG/ProQPay headcount — excluded from client payroll KPIs.",
    },
  });

  const prospects: {
    id: string;
    name: string;
    amount: number;
    stage: SalesStage;
    probability: number;
    period: string;
    headcount: string;
    next: string;
    projectCode: string;
    projectName: string;
  }[] = [
    {
      id: MLS_ID,
      name: "PT Mitra Langgeng Sejati",
      amount: 2_000_000_000,
      stage: "NEGOTIATION",
      probability: 65,
      period: "2026-06-01",
      headcount: "160-210",
      next: "Finalisasi scope dan commercial proposal",
      projectCode: "MLS-PMS-2026",
      projectName: "Payroll Managed Service – Mitra Langgeng Sejati",
    },
    {
      id: QSG_ID,
      name: "PT Qjob Saka Gemilang",
      amount: 2_000_000_000,
      stage: "PROPOSAL",
      probability: 50,
      period: "2026-07-01",
      headcount: "170-220",
      next: "Data validation dan implementation workshop",
      projectCode: "QSG-EPO-2026",
      projectName: "Enterprise Payroll Operation – Qjob Saka Gemilang",
    },
    {
      id: OGG_ID,
      name: "PT Oversea Global Group",
      amount: 200_000_000,
      stage: "QUALIFIED",
      probability: 30,
      period: "2026-07-01",
      headcount: "18-25",
      next: "Discovery meeting",
      projectCode: "OGG-PA-2026",
      projectName: "Payroll Administration – Oversea Global Group",
    },
  ];

  for (const p of prospects) {
    await prisma.company.create({
      data: {
        id: p.id,
        organizationId: orgId,
        name: p.name,
        legalName: p.name,
        address: "Jakarta",
        lifecycleStatus: "PROSPECT",
        clientType: "PROSPECT",
        industry: "Business Services",
        employeeRange: p.headcount,
        estimatedMonthlyPayroll: p.amount,
        defaultFundingModel: "SELF_FUNDED",
        fundingEnabled: false,
        workingCapitalStatus: "NOT_ENABLED",
        source: "baseline-2026",
        internalNotes: `Prospect only. Forecast period ${p.period}. Next: ${p.next}`,
      },
    });
  }

  // Operator users
  const userIds: Record<string, string> = {};
  for (const u of PRESERVED_USERS) {
    const id = stableId(`user:${u.email}`);
    userIds[u.email] = id;
    const companyId =
      u.role === "SUPER_ADMIN" || u.role === "DIRECTOR"
        ? null
        : u.role === "HR"
          ? INT_ID
          : ATE_ID;
    await prisma.user.create({
      data: {
        id,
        organizationId: orgId,
        companyId,
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        department: u.department,
        avatarInitials: u.initials,
      },
    });
  }

  // Account owners
  await prisma.company.update({
    where: { id: ATE_ID },
    data: { accountOwnerUserId: userIds["siti.rahayu@msg-os.com"] },
  });
  for (const p of prospects) {
    await prisma.company.update({
      where: { id: p.id },
      data: { accountOwnerUserId: userIds["andi.wijaya@msg-os.com"] },
    });
  }

  // Banks
  const ateBankId = stableId("bank:ate:bca");
  await prisma.bankAccount.create({
    data: {
      id: ateBankId,
      companyId: ATE_ID,
      purpose: "CLIENT_PAYROLL_SOURCE",
      bank: "BCA",
      bankCode: "BCA",
      accountName: "PT Anak Tiga Emas",
      account: "088-99002187",
      maskedAccountNumber: maskAccount(2187),
      label: "ATE Payroll Source",
      currency: "IDR",
      status: "ACTIVE",
      isPrimary: true,
    },
  });
  await prisma.bankAccount.create({
    data: {
      id: stableId("bank:ate:mandiri"),
      companyId: ATE_ID,
      purpose: "OTHER",
      bank: "Mandiri",
      bankCode: "MDR",
      accountName: "PT Anak Tiga Emas",
      account: "14000-3344432",
      maskedAccountNumber: maskAccount(4432),
      label: "ATE Operating",
      currency: "IDR",
      status: "ACTIVE",
      isPrimary: false,
    },
  });

  // Projects
  const ateProjectId = stableId("project:ate-mps");
  await prisma.project.create({
    data: {
      id: ateProjectId,
      companyId: ATE_ID,
      clientName: "PT Anak Tiga Emas",
      code: "ATE-MPS-2026",
      name: "Managed Payroll Services – PT Anak Tiga Emas",
      site: "Jakarta HQ",
      location: "Jakarta",
      contractRef: "CTR-ATE-2026-001",
      status: "ACTIVE",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-05-31"),
    },
  });

  const intProjectId = stableId("project:int-pqp");
  await prisma.project.create({
    data: {
      id: intProjectId,
      companyId: INT_ID,
      clientName: "ProQPay Internal",
      code: "INT-PQP-2026",
      name: "Internal Payroll – ProQPay Operations",
      site: "MSG HQ",
      location: "Jakarta",
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
  });

  for (const p of prospects) {
    await prisma.project.create({
      data: {
        id: stableId(`project:${p.projectCode}`),
        companyId: p.id,
        clientName: p.name,
        code: p.projectCode,
        name: p.projectName,
        location: "Jakarta",
        status: "DRAFT",
        startDate: new Date(p.period),
      },
    });
  }

  // ATE employees
  const ateEmpIds: Record<string, string> = {};
  for (const [i, e] of ATE_EMPLOYEES.entries()) {
    const id = stableId(`emp:ate:${e.code}`);
    ateEmpIds[e.code] = id;
    await prisma.employee.create({
      data: {
        id,
        companyId: ATE_ID,
        employeeCode: e.code,
        name: e.name,
        email: `${emailSlug(e.name)}@anaktigaemas.example`,
        phone: `0812-${String(1000 + i).slice(-4)}-${String(2000 + i).slice(-4)}`,
        department: e.department,
        position: e.position,
        joinDate: new Date(e.joinDate),
        status: e.status,
        baseSalary: e.baseSalary,
        bankName: ["BCA", "Mandiri", "BNI", "BRI"][i % 4],
        bankAccount: `88${String(10000000 + i * 137).slice(0, 8)}`,
        taxStatus: i % 3 === 0 ? "K/1" : "TK/0",
        bpjsNumber: `0009${String(100000000 + i).slice(0, 9)}`,
        npwp: `10.20.30.${String(40 + (i % 50)).padStart(2, "0")}-567.${String(i).padStart(3, "0")}`,
        identityNumber: `31740${String(1000000000 + i * 17).slice(0, 10)}`,
        bpjsKesehatan: `0008${String(100000000 + i).slice(0, 9)}`,
        bpjsTk: `0007${String(100000000 + i).slice(0, 9)}`,
        ptkpStatus: i % 3 === 0 ? "K/1" : "TK/0",
        taxMethod: "GROSS",
        contractType: e.contractType,
        contractEnd:
          e.contractType === "CONTRACT"
            ? new Date("2026-12-31")
            : null,
        terminateDate: e.status === "RESIGNED" ? new Date("2026-06-30") : null,
      },
    });
    await prisma.projectAssignment.create({
      data: {
        id: stableId(`assign:ate:${e.code}`),
        projectId: ateProjectId,
        employeeId: id,
        roleLabel: e.position,
        startDate: new Date(e.joinDate),
        endDate: e.status === "RESIGNED" ? new Date("2026-06-30") : null,
        isActive: e.status !== "RESIGNED",
      },
    });
  }

  // Internal employees
  const intEmpList: { id: string; name: string; department: string; baseSalary: number }[] = [];
  for (const [i, e] of INTERNAL_EMPLOYEES.entries()) {
    const id = stableId(`emp:int:${e.code}`);
    intEmpList.push({
      id,
      name: e.name,
      department: e.department,
      baseSalary: e.baseSalary,
    });
    await prisma.employee.create({
      data: {
        id,
        companyId: INT_ID,
        employeeCode: e.code,
        name: e.name,
        email: `${emailSlug(e.name)}@proqpay.example`,
        phone: `0813-${String(3000 + i).slice(-4)}-${String(4000 + i).slice(-4)}`,
        department: e.department,
        position: e.position,
        joinDate: new Date(e.joinDate),
        status: e.status,
        baseSalary: e.baseSalary,
        bankName: ["BCA", "Mandiri", "BNI", "BRI"][i % 4],
        bankAccount: `99${String(20000000 + i * 91).slice(0, 8)}`,
        taxStatus: "TK/0",
        bpjsNumber: `0006${String(200000000 + i).slice(0, 9)}`,
        npwp: `01.10.20.${String(10 + i).padStart(2, "0")}-111.${String(i).padStart(3, "0")}`,
        contractType: e.contractType,
        taxMethod: "GROSS",
      },
    });
    await prisma.projectAssignment.create({
      data: {
        id: stableId(`assign:int:${e.code}`),
        projectId: intProjectId,
        employeeId: id,
        roleLabel: e.position,
        startDate: new Date(e.joinDate),
        isActive: true,
      },
    });
  }

  async function createCompletedPayroll(opts: {
    periodKey: string;
    companyId: string;
    projectId: string;
    name: string;
    start: string;
    end: string;
    payDate: string;
    targetNet: number;
    employees: { id: string; name: string; department: string; baseSalary: number }[];
    bankId: string | null;
    timestamps: {
      created: string;
      submitted: string;
      approved: string;
      instruction: string;
      confirmed: string;
      disbursed: string;
    };
  }) {
    const lines = buildLinesExact(opts.employees, opts.targetNet);
    const totalGross = lines.reduce(
      (s, l) => s + l.baseSalary + l.allowances + l.overtime + l.bonuses,
      0,
    );
    const totalDeductions = lines.reduce(
      (s, l) => s + l.deductions + l.tax + l.bpjs,
      0,
    );
    const totalBpjs = lines.reduce((s, l) => s + l.bpjs, 0);
    const totalPph = lines.reduce((s, l) => s + l.tax, 0);
    const periodId = stableId(`period:${opts.periodKey}`);

    await prisma.payrollPeriod.create({
      data: {
        id: periodId,
        companyId: opts.companyId,
        projectId: opts.projectId,
        name: opts.name,
        periodStart: new Date(opts.start),
        periodEnd: new Date(opts.end),
        payDate: new Date(opts.payDate),
        status: "CLOSED",
        fundingModel: "SELF_FUNDED",
        sourceBankAccountId: opts.bankId,
        executionType: "CLIENT_BANK_TRANSFER",
        fundingStatus: "NOT_REQUIRED",
        paymentInstructionStatus: "EXECUTED",
        reconciliationStatus: "RECONCILED",
        confirmationStatus: "VERIFIED",
        employeeCount: lines.length,
        totalGross,
        totalDeductions,
        totalNet: opts.targetNet,
        totalBpjsEmployee: totalBpjs,
        totalBpjsEmployer: Math.round(totalBpjs * 1.2),
        totalPph21: totalPph,
        lockedAt: new Date(opts.timestamps.approved),
        createdAt: new Date(opts.timestamps.created),
        updatedAt: new Date(opts.timestamps.disbursed),
      },
    });

    for (const [i, line] of lines.entries()) {
      await prisma.payrollLine.create({
        data: {
          id: stableId(`line:${opts.periodKey}:${i}`),
          payrollPeriodId: periodId,
          employeeId: line.employeeId,
          employeeName: line.employeeName,
          department: line.department,
          baseSalary: line.baseSalary,
          allowances: line.allowances,
          overtime: line.overtime,
          bonuses: line.bonuses,
          deductions: line.deductions,
          tax: line.tax,
          bpjs: line.bpjs,
          netPay: line.netPay,
        },
      });
    }

    // Approvals
    const approvers = [
      { level: 1, name: "Siti Rahayu", role: "PAYROLL_ADMIN" as Role, email: "siti.rahayu@msg-os.com" },
      { level: 2, name: "Budi Santoso", role: "FINANCE" as Role, email: "budi.santoso@msg-os.com" },
      { level: 3, name: "Rina Kusuma", role: "APPROVER" as Role, email: "rina.kusuma@msg-os.com" },
    ];
    for (const a of approvers) {
      await prisma.approvalStep.create({
        data: {
          id: stableId(`appr:${opts.periodKey}:${a.level}`),
          payrollPeriodId: periodId,
          level: a.level,
          approverName: a.name,
          role: a.role,
          status: "APPROVED",
          comment: "Approved",
          actedAt: new Date(opts.timestamps.approved),
          userId: userIds[a.email],
        },
      });
    }

    const piId = stableId(`pi:${opts.periodKey}`);
    await prisma.paymentInstruction.create({
      data: {
        id: piId,
        companyId: opts.companyId,
        payrollPeriodId: periodId,
        instructionNumber: `PI-${opts.periodKey.toUpperCase()}`,
        fundingModel: "SELF_FUNDED",
        executionModel: "CLIENT_SELF_TRANSFER",
        executionType: "CLIENT_BANK_TRANSFER",
        integrationStatus: "FILE_BASED",
        sourceBankAccountId: opts.bankId,
        totalRecords: lines.length,
        totalAmount: opts.targetNet,
        currency: "IDR",
        approvalStatus: "APPROVED",
        executionStatus: "EXECUTED",
        generatedById: userIds["siti.rahayu@msg-os.com"],
        generatedAt: new Date(opts.timestamps.instruction),
        submittedAt: new Date(opts.timestamps.instruction),
        executedAt: new Date(opts.timestamps.disbursed),
      },
    });

    for (const [i, line] of lines.entries()) {
      await prisma.paymentInstructionItem.create({
        data: {
          id: stableId(`pii:${opts.periodKey}:${i}`),
          paymentInstructionId: piId,
          employeeId: line.employeeId,
          recipientName: line.employeeName,
          bankCode: "BCA",
          maskedAccountNumber: maskAccount(2000 + i),
          amount: line.netPay,
          status: "SUCCESS",
          executedAt: new Date(opts.timestamps.disbursed),
        },
      });
    }

    const confId = stableId(`conf:${opts.periodKey}`);
    await prisma.paymentConfirmation.create({
      data: {
        id: confId,
        companyId: opts.companyId,
        payrollPeriodId: periodId,
        paymentInstructionId: piId,
        confirmationNumber: `PC-${opts.periodKey.toUpperCase()}`,
        paymentAmount: opts.targetNet,
        paymentDate: new Date(opts.timestamps.confirmed),
        payerBank: "BCA",
        payerAccountName: "Client Payroll Account",
        payerAccountMasked: maskAccount(9051),
        referenceNumber: `TRX-${opts.periodKey.toUpperCase()}-OK`,
        status: "VERIFIED",
        notes: "Transfer proof verified",
        uploadedById: userIds["siti.rahayu@msg-os.com"],
        verifiedById: userIds["budi.santoso@msg-os.com"],
        verifiedAt: new Date(opts.timestamps.confirmed),
      },
    });

    await prisma.disbursementBatch.create({
      data: {
        id: stableId(`disb:${opts.periodKey}`),
        payrollPeriodId: periodId,
        periodName: opts.name,
        bankName: "BCA",
        totalAmount: opts.targetNet,
        itemCount: lines.length,
        status: "PAID",
        referenceNumber: `DISB-${opts.periodKey.toUpperCase()}`,
        createdAt: new Date(opts.timestamps.instruction),
        processedAt: new Date(opts.timestamps.disbursed),
      },
    });

    await prisma.auditLog.create({
      data: {
        id: stableId(`audit:period:${opts.periodKey}`),
        companyId: opts.companyId,
        userId: userIds["siti.rahayu@msg-os.com"],
        userName: "Siti Rahayu",
        userRole: "PAYROLL_ADMIN",
        action: "PAYROLL_CLOSED",
        entity: "PayrollPeriod",
        entityId: periodId,
        detail: `${opts.name} closed — totalNet ${opts.targetNet}`,
        ip: "10.0.0.10",
        timestamp: new Date(opts.timestamps.disbursed),
      },
    });

    return { periodId, lines, totalGross, totalDeductions };
  }

  // ATE June / July employees
  const juneEmps = ATE_EMPLOYEES.filter((e) => e.june).map((e) => ({
    id: ateEmpIds[e.code],
    name: e.name,
    department: e.department,
    baseSalary: e.baseSalary,
  }));
  const julyEmps = ATE_EMPLOYEES.filter((e) => e.july).map((e) => ({
    id: ateEmpIds[e.code],
    name: e.name,
    department: e.department,
    baseSalary: e.baseSalary,
  }));

  const june = await createCompletedPayroll({
    periodKey: "ate-2026-06",
    companyId: ATE_ID,
    projectId: ateProjectId,
    name: "Juni 2026",
    start: "2026-06-01",
    end: "2026-06-30",
    payDate: "2026-06-30",
    targetNet: ATE_JUNE_NET,
    employees: juneEmps,
    bankId: ateBankId,
    timestamps: {
      created: "2026-06-23T03:00:00.000Z",
      submitted: "2026-06-25T04:00:00.000Z",
      approved: "2026-06-26T05:00:00.000Z",
      instruction: "2026-06-27T06:00:00.000Z",
      confirmed: "2026-06-29T07:00:00.000Z",
      disbursed: "2026-06-30T08:00:00.000Z",
    },
  });

  const july = await createCompletedPayroll({
    periodKey: "ate-2026-07",
    companyId: ATE_ID,
    projectId: ateProjectId,
    name: "Juli 2026",
    start: "2026-07-01",
    end: "2026-07-31",
    payDate: "2026-07-31",
    targetNet: ATE_JULY_NET,
    employees: julyEmps,
    bankId: ateBankId,
    timestamps: {
      created: "2026-07-22T03:00:00.000Z",
      submitted: "2026-07-24T04:00:00.000Z",
      approved: "2026-07-25T05:00:00.000Z",
      instruction: "2026-07-26T06:00:00.000Z",
      confirmed: "2026-07-28T07:00:00.000Z",
      disbursed: "2026-07-30T08:00:00.000Z",
    },
  });

  // August active draft (not historical paid)
  const augEmps = julyEmps;
  const augTarget = 350_000_000;
  const augLines = buildLinesExact(augEmps, augTarget);
  const augGross = augLines.reduce(
    (s, l) => s + l.baseSalary + l.allowances + l.overtime + l.bonuses,
    0,
  );
  const augDed = augLines.reduce((s, l) => s + l.deductions + l.tax + l.bpjs, 0);
  const augPeriodId = stableId("period:ate-2026-08");
  await prisma.payrollPeriod.create({
    data: {
      id: augPeriodId,
      companyId: ATE_ID,
      projectId: ateProjectId,
      name: "Agustus 2026",
      periodStart: new Date("2026-08-01"),
      periodEnd: new Date("2026-08-31"),
      payDate: new Date("2026-08-31"),
      status: "DRAFT",
      fundingModel: "SELF_FUNDED",
      sourceBankAccountId: ateBankId,
      executionType: "CLIENT_BANK_TRANSFER",
      fundingStatus: "NOT_REQUIRED",
      paymentInstructionStatus: "NOT_STARTED",
      reconciliationStatus: "NOT_STARTED",
      employeeCount: augLines.length,
      totalGross: augGross,
      totalDeductions: augDed,
      totalNet: augTarget,
      totalBpjsEmployee: augLines.reduce((s, l) => s + l.bpjs, 0),
      totalPph21: augLines.reduce((s, l) => s + l.tax, 0),
    },
  });
  for (const [i, line] of augLines.entries()) {
    await prisma.payrollLine.create({
      data: {
        id: stableId(`line:ate-2026-08:${i}`),
        payrollPeriodId: augPeriodId,
        employeeId: line.employeeId,
        employeeName: line.employeeName,
        department: line.department,
        baseSalary: line.baseSalary,
        allowances: line.allowances,
        overtime: line.overtime,
        bonuses: line.bonuses,
        deductions: line.deductions,
        tax: line.tax,
        bpjs: line.bpjs,
        netPay: line.netPay,
      },
    });
  }

  // Internal payroll June/July (excluded from client historical 738M)
  const intJuneTarget = 255_000_000;
  const intJulyTarget = 260_000_000;
  await createCompletedPayroll({
    periodKey: "int-2026-06",
    companyId: INT_ID,
    projectId: intProjectId,
    name: "Internal Juni 2026",
    start: "2026-06-01",
    end: "2026-06-30",
    payDate: "2026-06-28",
    targetNet: intJuneTarget,
    employees: intEmpList,
    bankId: null,
    timestamps: {
      created: "2026-06-20T03:00:00.000Z",
      submitted: "2026-06-22T04:00:00.000Z",
      approved: "2026-06-23T05:00:00.000Z",
      instruction: "2026-06-24T06:00:00.000Z",
      confirmed: "2026-06-26T07:00:00.000Z",
      disbursed: "2026-06-28T08:00:00.000Z",
    },
  });
  await createCompletedPayroll({
    periodKey: "int-2026-07",
    companyId: INT_ID,
    projectId: intProjectId,
    name: "Internal Juli 2026",
    start: "2026-07-01",
    end: "2026-07-31",
    payDate: "2026-07-28",
    targetNet: intJulyTarget,
    employees: intEmpList,
    bankId: null,
    timestamps: {
      created: "2026-07-20T03:00:00.000Z",
      submitted: "2026-07-22T04:00:00.000Z",
      approved: "2026-07-23T05:00:00.000Z",
      instruction: "2026-07-24T06:00:00.000Z",
      confirmed: "2026-07-26T07:00:00.000Z",
      disbursed: "2026-07-28T08:00:00.000Z",
    },
  });

  // Sales opportunities (prospect pipeline — not processed payroll)
  let pipelineSum = 0;
  for (const p of prospects) {
    const weighted = Math.round((p.amount * p.probability) / 100);
    pipelineSum += p.amount;
    await prisma.salesOpportunity.create({
      data: {
        id: stableId(`opp:${p.id}`),
        organizationId: orgId,
        companyId: p.id,
        prospectName: p.name,
        stage: p.stage,
        estimatedPayrollValue: p.amount,
        probabilityPercentage: p.probability,
        weightedPipelineValue: weighted,
        expectedGoLiveDate: new Date(p.period),
        expectedCloseDate: new Date(
          p.period === "2026-06-01" ? "2026-08-15" : "2026-09-30",
        ),
        fundingInterest: p.amount >= 1_000_000_000,
        proposedFundingModel: "SELF_FUNDED",
        salesOwnerUserId: userIds["andi.wijaya@msg-os.com"],
        source: "baseline-2026",
        notes: p.next,
        status: "OPEN",
      },
    });
  }
  if (pipelineSum !== PIPELINE_TOTAL) {
    throw new Error(`Pipeline total ${pipelineSum} != ${PIPELINE_TOTAL}`);
  }

  // Attendance sample (ATE — mid June week)
  const attSample = ATE_EMPLOYEES.filter((e) => e.june).slice(0, 12);
  for (const [i, e] of attSample.entries()) {
    const type =
      i % 11 === 0 ? "LATE" : i % 9 === 0 ? "LEAVE" : i % 13 === 0 ? "SICK" : "PRESENT";
    await prisma.attendanceRecord.create({
      data: {
        id: stableId(`att:ate:0615:${e.code}`),
        companyId: ATE_ID,
        employeeId: ateEmpIds[e.code],
        projectId: ateProjectId,
        workDate: new Date("2026-06-15"),
        type: type as "PRESENT" | "LATE" | "LEAVE" | "SICK",
        hoursWorked: type === "PRESENT" || type === "LATE" ? 8 : 0,
        overtimeHours: i % 7 === 0 ? 2 : 0,
        notes: type === "LEAVE" ? "Approved leave" : null,
      },
    });
  }

  // Audit baseline events
  await prisma.auditLog.createMany({
    data: [
      {
        id: stableId("audit:client:ate"),
        companyId: ATE_ID,
        userId: userIds["admin@msg-os.com"],
        userName: "MSG Super Admin",
        userRole: "SUPER_ADMIN",
        action: "CLIENT_CREATED",
        entity: "Company",
        entityId: ATE_ID,
        detail: "PT Anak Tiga Emas onboarded as existing client",
        ip: "10.0.0.1",
        timestamp: new Date("2026-05-20T02:00:00.000Z"),
      },
      {
        id: stableId("audit:project:ate"),
        companyId: ATE_ID,
        userId: userIds["siti.rahayu@msg-os.com"],
        userName: "Siti Rahayu",
        userRole: "PAYROLL_ADMIN",
        action: "PROJECT_CREATED",
        entity: "Project",
        entityId: ateProjectId,
        detail: "ATE-MPS-2026 activated",
        ip: "10.0.0.10",
        timestamp: new Date("2026-05-22T03:00:00.000Z"),
      },
      {
        id: stableId("audit:prospect:mls"),
        companyId: MLS_ID,
        userId: userIds["andi.wijaya@msg-os.com"],
        userName: "Andi Wijaya",
        userRole: "DIRECTOR",
        action: "PROSPECT_STAGE_CHANGED",
        entity: "SalesOpportunity",
        entityId: stableId(`opp:${MLS_ID}`),
        detail: "Stage → NEGOTIATION",
        ip: "10.0.0.2",
        timestamp: new Date("2026-06-10T04:00:00.000Z"),
      },
    ],
  });

  return {
    june,
    july,
    juneHeadcount: juneEmps.length,
    julyHeadcount: julyEmps.length,
    ateEmployees: ATE_EMPLOYEES.length,
    internalEmployees: INTERNAL_EMPLOYEES.length,
    prospects: prospects.length,
  };
}

async function validate() {
  const ateClosed = await prisma.payrollPeriod.findMany({
    where: {
      companyId: ATE_ID,
      status: "CLOSED",
      name: { in: ["Juni 2026", "Juli 2026"] },
    },
    select: { name: true, totalNet: true, employeeCount: true },
  });
  const june = ateClosed.find((p) => p.name === "Juni 2026");
  const july = ateClosed.find((p) => p.name === "Juli 2026");
  const juneNet = Number(june?.totalNet ?? 0);
  const julyNet = Number(july?.totalNet ?? 0);

  const juneLines = await prisma.payrollLine.aggregate({
    where: { payrollPeriod: { companyId: ATE_ID, name: "Juni 2026" } },
    _sum: { netPay: true },
    _count: true,
  });
  const julyLines = await prisma.payrollLine.aggregate({
    where: { payrollPeriod: { companyId: ATE_ID, name: "Juli 2026" } },
    _sum: { netPay: true },
    _count: true,
  });

  const pipeline = await prisma.salesOpportunity.aggregate({
    where: { status: "OPEN" },
    _sum: { estimatedPayrollValue: true },
  });

  const existing = await prisma.company.count({
    where: { clientType: "EXISTING", lifecycleStatus: "ACTIVE" },
  });
  const prospectCount = await prisma.company.count({
    where: { clientType: "PROSPECT" },
  });
  const prospectCompletedPayroll = await prisma.payrollPeriod.count({
    where: {
      company: { clientType: "PROSPECT" },
      status: { in: ["CLOSED", "VERIFIED", "DISBURSED"] },
    },
  });

  const checks = [
    {
      name: "ATE June Payroll (totalNet)",
      expected: ATE_JUNE_NET,
      actual: juneNet,
    },
    {
      name: "ATE June line sum",
      expected: ATE_JUNE_NET,
      actual: Number(juneLines._sum.netPay ?? 0),
    },
    {
      name: "ATE July Payroll (totalNet)",
      expected: ATE_JULY_NET,
      actual: julyNet,
    },
    {
      name: "ATE July line sum",
      expected: ATE_JULY_NET,
      actual: Number(julyLines._sum.netPay ?? 0),
    },
    {
      name: "ATE Historical Total",
      expected: ATE_HISTORICAL_NET,
      actual: juneNet + julyNet,
    },
    {
      name: "Prospect Pipeline",
      expected: PIPELINE_TOTAL,
      actual: Number(pipeline._sum.estimatedPayrollValue ?? 0),
    },
    { name: "Existing Client Count", expected: 1, actual: existing },
    { name: "Prospect Client Count", expected: 3, actual: prospectCount },
    {
      name: "Prospect completed payroll",
      expected: 0,
      actual: prospectCompletedPayroll,
    },
  ];

  let allPass = true;
  console.log("\n=== Reconciliation ===");
  for (const c of checks) {
    const pass = c.actual === c.expected;
    if (!pass) allPass = false;
    console.log(
      `${pass ? "PASS" : "FAIL"} ${c.name}: expected ${typeof c.expected === "number" && c.expected > 1000 ? idr(c.expected) : c.expected}, actual ${typeof c.actual === "number" && c.actual > 1000 ? idr(c.actual) : c.actual}`,
    );
  }
  return { allPass, checks, june, july, juneLines, julyLines };
}

async function main() {
  console.log("══════════════════════════════════════════════");
  console.log(" ProQPay realistic baseline reseed");
  console.log(` Mode: ${EXECUTE && !DRY_RUN ? "EXECUTE" : "DRY-RUN"}`);
  console.log("══════════════════════════════════════════════");

  if (EXECUTE && process.env.ALLOW_DATA_RESEED !== "true") {
    console.error(
      "Refusing execute: set ALLOW_DATA_RESEED=true to enable destructive reseed.",
    );
    process.exit(1);
  }
  if (EXECUTE && isProductionLike() && !CONFIRM_PRODUCTION) {
    console.error(
      "Refusing execute on production-like environment without --confirm-production.",
    );
    process.exit(1);
  }

  const before = await inventory();
  console.log("\nBefore inventory:");
  console.log(
    JSON.stringify(
      {
        ...before,
        companies: before.companies.map((c) => c.name),
      },
      null,
      2,
    ),
  );

  console.log("\nWill PRESERVE operator users:");
  for (const e of PRESERVED_EMAILS) console.log(`  - ${e}`);

  console.log("\nWill DELETE all operational data including:");
  console.log("  - demo company 'PT Mandiri Semesta Gemilang — Client Demo Co.'");
  console.log("  - all employees, payroll, projects, sales, capital, attendance, audit");
  console.log("  - non-operator users");

  console.log("\nWill CREATE:");
  console.log("  Existing: PT Anak Tiga Emas (ACTIVE)");
  console.log("  Prospects: MLS, QSG, OGG");
  console.log("  Internal: ProQPay Internal Operations");
  console.log(`  ATE employees: ${ATE_EMPLOYEES.length}`);
  console.log(`  Internal employees: ${INTERNAL_EMPLOYEES.length}`);
  console.log(`  ATE June totalNet: ${idr(ATE_JUNE_NET)}`);
  console.log(`  ATE July totalNet: ${idr(ATE_JULY_NET)}`);
  console.log(`  ATE Historical: ${idr(ATE_HISTORICAL_NET)}`);
  console.log(`  Prospect pipeline: ${idr(PIPELINE_TOTAL)}`);
  console.log("  Field mapping: Dashboard Total Payroll = PayrollPeriod.totalNet");

  if (!EXECUTE || DRY_RUN) {
    console.log("\nDry-run complete — no database changes written.");
    console.log("To execute: ALLOW_DATA_RESEED=true pnpm seed:realistic -- --execute");
    return;
  }

  console.log("\nExecuting cleanup + seed…");
  // Long-running seed outside short ITX (Supabase pooler / pgbouncer limits)
  await cleanupAll();
  console.log("Cleanup completed.");
  const created = await seedBaseline();
  console.log("Seed completed.", {
    juneHeadcount: created.juneHeadcount,
    julyHeadcount: created.julyHeadcount,
    ateEmployees: created.ateEmployees,
    internalEmployees: created.internalEmployees,
    prospects: created.prospects,
  });

  const result = await validate();
  const after = await inventory();
  console.log("\nAfter inventory:");
  console.log(
    JSON.stringify(
      {
        company: after.company,
        employee: after.employee,
        payrollPeriod: after.payrollPeriod,
        payrollLine: after.payrollLine,
        project: after.project,
        salesOpportunity: after.salesOpportunity,
        companies: after.companies.map((c) => `${c.name} [${c.clientType}/${c.lifecycleStatus}]`),
      },
      null,
      2,
    ),
  );

  if (!result.allPass) {
    console.error("\nValidation FAILED");
    process.exit(1);
  }
  console.log("\nAll reconciliation checks PASS.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
