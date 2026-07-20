/**
 * Seeds ProQPay multi-tenant demo data into Supabase PostgreSQL (schema: proqpay).
 * Safe to re-run: uses deterministic IDs + upsert.
 */
import { PrismaClient, type Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { createHash } from "crypto";
import { DEMO_PASSWORD } from "../lib/data/constants";

const prisma = new PrismaClient();

function stableId(name: string): string {
  const hashHex = createHash("sha256")
    .update(`proqpay:${name}`)
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

const ORG_ID = stableId("org:msg");
const COMPANY_ID = stableId("company:demo");

const usersSeed: {
  key: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  initials: string;
}[] = [
  {
    key: "siti",
    email: "siti.rahayu@msg-os.com",
    name: "Siti Rahayu",
    role: "PAYROLL_ADMIN",
    department: "Payroll Operations",
    initials: "SR",
  },
  {
    key: "budi",
    email: "budi.santoso@msg-os.com",
    name: "Budi Santoso",
    role: "FINANCE",
    department: "Finance",
    initials: "BS",
  },
  {
    key: "andi",
    email: "andi.wijaya@msg-os.com",
    name: "Andi Wijaya",
    role: "DIRECTOR",
    department: "Board",
    initials: "AW",
  },
  {
    key: "dewi",
    email: "dewi.lestari@msg-os.com",
    name: "Dewi Lestari",
    role: "HR",
    department: "Human Resources",
    initials: "DL",
  },
  {
    key: "rina",
    email: "rina.kusuma@msg-os.com",
    name: "Rina Kusuma",
    role: "APPROVER",
    department: "Finance Control",
    initials: "RK",
  },
  {
    key: "admin",
    email: "admin@msg-os.com",
    name: "MSG Super Admin",
    role: "SUPER_ADMIN",
    department: "MSG Operations",
    initials: "SA",
  },
];

const employeesSeed = [
  {
    code: "MSG-1001",
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@client.example",
    phone: "0812-3456-7801",
    department: "Operations",
    position: "Site Supervisor",
    joinDate: "2022-03-15",
    status: "ACTIVE" as const,
    baseSalary: 8500000,
    bankName: "BCA",
    bankAccount: "1234567890",
    taxStatus: "K/1",
    bpjsNumber: "0001234567891",
    npwp: "10.20.30.40-567.000",
  },
  {
    code: "MSG-1002",
    name: "Fitri Handayani",
    email: "fitri.handayani@client.example",
    phone: "0813-2211-4455",
    department: "Finance",
    position: "Finance Analyst",
    joinDate: "2021-07-01",
    status: "ACTIVE" as const,
    baseSalary: 12000000,
    bankName: "Mandiri",
    bankAccount: "1400012345678",
    taxStatus: "TK/0",
    bpjsNumber: "0001234567892",
    npwp: "10.20.30.40-567.001",
  },
  {
    code: "MSG-1003",
    name: "Rizky Pratama",
    email: "rizky.pratama@client.example",
    phone: "0856-7788-9900",
    department: "Engineering",
    position: "Mechanical Engineer",
    joinDate: "2023-01-10",
    status: "ACTIVE" as const,
    baseSalary: 15000000,
    bankName: "BNI",
    bankAccount: "0987654321",
    taxStatus: "K/0",
    bpjsNumber: "0001234567893",
    npwp: "10.20.30.40-567.002",
  },
  {
    code: "MSG-1004",
    name: "Nurul Aisyah",
    email: "nurul.aisyah@client.example",
    phone: "0821-3344-5566",
    department: "HR",
    position: "HR Generalist",
    joinDate: "2020-11-20",
    status: "ACTIVE" as const,
    baseSalary: 9500000,
    bankName: "BRI",
    bankAccount: "0123456789012",
    taxStatus: "TK/1",
    bpjsNumber: "0001234567894",
    npwp: "10.20.30.40-567.003",
  },
  {
    code: "MSG-1005",
    name: "Dimas Anggara",
    email: "dimas.anggara@client.example",
    phone: "0877-6655-4433",
    department: "Logistics",
    position: "Warehouse Lead",
    joinDate: "2022-09-05",
    status: "ACTIVE" as const,
    baseSalary: 7800000,
    bankName: "BCA",
    bankAccount: "9876543210",
    taxStatus: "K/2",
    bpjsNumber: "0001234567895",
    npwp: "10.20.30.40-567.004",
  },
  {
    code: "MSG-1006",
    name: "Salsa Mahardika",
    email: "salsa.mahardika@client.example",
    phone: "0811-2233-4455",
    department: "Admin",
    position: "Admin Officer",
    joinDate: "2024-02-12",
    status: "PROBATION" as const,
    baseSalary: 6500000,
    bankName: "CIMB Niaga",
    bankAccount: "5566778899",
    taxStatus: "TK/0",
    bpjsNumber: "0001234567896",
    npwp: "10.20.30.40-567.005",
  },
  {
    code: "MSG-1007",
    name: "Hendra Gunawan",
    email: "hendra.gunawan@client.example",
    phone: "0819-8877-6655",
    department: "Operations",
    position: "Field Coordinator",
    joinDate: "2019-08-01",
    status: "ACTIVE" as const,
    baseSalary: 11000000,
    bankName: "Mandiri",
    bankAccount: "1400098765432",
    taxStatus: "K/1",
    bpjsNumber: "0001234567897",
    npwp: "10.20.30.40-567.006",
  },
  {
    code: "MSG-1008",
    name: "Maya Putri",
    email: "maya.putri@client.example",
    phone: "0822-1100-9988",
    department: "IT",
    position: "IT Support",
    joinDate: "2023-06-18",
    status: "ACTIVE" as const,
    baseSalary: 9000000,
    bankName: "BCA",
    bankAccount: "1122334455",
    taxStatus: "TK/0",
    bpjsNumber: "0001234567898",
    npwp: "10.20.30.40-567.007",
  },
  {
    code: "MSG-1009",
    name: "Yoga Firmansyah",
    email: "yoga.firmansyah@client.example",
    phone: "0857-3344-2211",
    department: "Engineering",
    position: "Civil Engineer",
    joinDate: "2021-04-22",
    status: "ACTIVE" as const,
    baseSalary: 14500000,
    bankName: "BNI",
    bankAccount: "6677889900",
    taxStatus: "K/0",
    bpjsNumber: "0001234567899",
    npwp: "10.20.30.40-567.008",
  },
  {
    code: "MSG-1010",
    name: "Lina Marlina",
    email: "lina.marlina@client.example",
    phone: "0813-9988-7766",
    department: "Finance",
    position: "Payroll Associate",
    joinDate: "2022-12-01",
    status: "ACTIVE" as const,
    baseSalary: 8000000,
    bankName: "BRI",
    bankAccount: "003344556677",
    taxStatus: "TK/1",
    bpjsNumber: "0001234567900",
    npwp: "10.20.30.40-567.009",
  },
  {
    code: "MSG-1011",
    name: "Agus Setiawan",
    email: "agus.setiawan@client.example",
    phone: "0812-5566-7788",
    department: "Operations",
    position: "Operator",
    joinDate: "2020-05-14",
    status: "ACTIVE" as const,
    baseSalary: 5500000,
    bankName: "Mandiri",
    bankAccount: "1400011223344",
    taxStatus: "K/3",
    bpjsNumber: "0001234567901",
    npwp: "10.20.30.40-567.010",
  },
  {
    code: "MSG-1012",
    name: "Putri Ayu",
    email: "putri.ayu@client.example",
    phone: "0878-1122-3344",
    department: "Sales",
    position: "Sales Executive",
    joinDate: "2023-09-01",
    status: "ACTIVE" as const,
    baseSalary: 7000000,
    bankName: "BCA",
    bankAccount: "4455667788",
    taxStatus: "TK/0",
    bpjsNumber: "0001234567902",
    npwp: "10.20.30.40-567.011",
  },
];

async function main() {
  console.log("Seeding proqpay schema…");

  const passwordHash = await hash(DEMO_PASSWORD, 10);

  await prisma.organization.upsert({
    where: { id: ORG_ID },
    create: {
      id: ORG_ID,
      name: "MSG Technology",
      slug: "msg-technology",
    },
    update: { name: "MSG Technology" },
  });

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: {
      id: COMPANY_ID,
      organizationId: ORG_ID,
      name: "PT Mandiri Semesta Gemilang — Client Demo Co.",
      legalName: "PT Contoh Mitra Usaha",
      npwp: "01.234.567.8-901.000",
      address: "SCBD Lot 9, Jakarta Selatan",
      lifecycleStatus: "ACTIVE",
      defaultFundingModel: "SELF_FUNDED",
      fundingEnabled: true,
      workingCapitalStatus: "ENABLED",
      workingCapitalLimit: 100000000,
      industry: "Workforce solutions",
    },
    update: {
      name: "PT Mandiri Semesta Gemilang — Client Demo Co.",
      legalName: "PT Contoh Mitra Usaha",
      npwp: "01.234.567.8-901.000",
      address: "SCBD Lot 9, Jakarta Selatan",
      lifecycleStatus: "ACTIVE",
      defaultFundingModel: "SELF_FUNDED",
      fundingEnabled: true,
      workingCapitalStatus: "ENABLED",
      workingCapitalLimit: 100000000,
      industry: "Workforce solutions",
    },
  });

  const userIds: Record<string, string> = {};
  for (const u of usersSeed) {
    const id = stableId(`user:${u.email}`);
    userIds[u.key] = id;
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        id,
        organizationId: ORG_ID,
        companyId: COMPANY_ID,
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        department: u.department,
        avatarInitials: u.initials,
      },
      update: {
        name: u.name,
        passwordHash,
        role: u.role,
        department: u.department,
        avatarInitials: u.initials,
        companyId: COMPANY_ID,
      },
    });
  }

  const banks = [
    {
      id: stableId("bank:mandiri"),
      bank: "Bank Mandiri",
      account: "14000-1122-3344",
      label: "Payroll Ops",
    },
    {
      id: stableId("bank:bca"),
      bank: "BCA",
      account: "088-1122334",
      label: "Disbursement Backup",
    },
  ];
  for (const b of banks) {
    await prisma.bankAccount.upsert({
      where: { id: b.id },
      create: {
        ...b,
        companyId: COMPANY_ID,
        purpose: "CLIENT_PAYROLL_SOURCE",
        maskedAccountNumber: "••••" + b.account.slice(-4),
        currency: "IDR",
        status: "ACTIVE",
        isPrimary: b.label.includes("Payroll"),
      },
      update: {
        bank: b.bank,
        account: b.account,
        label: b.label,
        purpose: "CLIENT_PAYROLL_SOURCE",
        maskedAccountNumber: "••••" + b.account.slice(-4),
      },
    });
  }

  const employeeIds: string[] = [];
  for (const e of employeesSeed) {
    const id = stableId(`employee:${e.code}`);
    employeeIds.push(id);
    await prisma.employee.upsert({
      where: {
        companyId_employeeCode: {
          companyId: COMPANY_ID,
          employeeCode: e.code,
        },
      },
      create: {
        id,
        companyId: COMPANY_ID,
        employeeCode: e.code,
        name: e.name,
        email: e.email,
        phone: e.phone,
        department: e.department,
        position: e.position,
        joinDate: new Date(e.joinDate),
        status: e.status,
        baseSalary: e.baseSalary,
        bankName: e.bankName,
        bankAccount: e.bankAccount,
        taxStatus: e.taxStatus,
        bpjsNumber: e.bpjsNumber,
        npwp: e.npwp,
      },
      update: {
        name: e.name,
        email: e.email,
        phone: e.phone,
        department: e.department,
        position: e.position,
        joinDate: new Date(e.joinDate),
        status: e.status,
        baseSalary: e.baseSalary,
        bankName: e.bankName,
        bankAccount: e.bankAccount,
        taxStatus: e.taxStatus,
        bpjsNumber: e.bpjsNumber,
        npwp: e.npwp,
      },
    });
  }

  const periods = [
    {
      id: stableId("period:2026-06"),
      name: "Juni 2026",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      payDate: "2026-07-05",
      status: "WAITING" as const,
      employeeCount: 12,
      totalGross: 142500000,
      totalDeductions: 18750000,
      totalNet: 123750000,
      createdAt: new Date("2026-06-28T02:00:00.000Z"),
    },
    {
      id: stableId("period:2026-05"),
      name: "Mei 2026",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      payDate: "2026-06-05",
      status: "DISBURSED" as const,
      employeeCount: 12,
      totalGross: 139800000,
      totalDeductions: 18200000,
      totalNet: 121600000,
      createdAt: new Date("2026-05-27T03:15:00.000Z"),
    },
    {
      id: stableId("period:2026-04"),
      name: "April 2026",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      payDate: "2026-05-05",
      status: "DISBURSED" as const,
      employeeCount: 11,
      totalGross: 128400000,
      totalDeductions: 16800000,
      totalNet: 111600000,
      createdAt: new Date("2026-04-26T04:00:00.000Z"),
    },
    {
      id: stableId("period:2026-07"),
      name: "Juli 2026",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      payDate: "2026-08-05",
      status: "DRAFT" as const,
      employeeCount: 0,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      createdAt: new Date("2026-07-15T01:00:00.000Z"),
    },
  ];

  for (const p of periods) {
    await prisma.payrollPeriod.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        companyId: COMPANY_ID,
        name: p.name,
        periodStart: new Date(p.periodStart),
        periodEnd: new Date(p.periodEnd),
        payDate: new Date(p.payDate),
        status: p.status,
        employeeCount: p.employeeCount,
        totalGross: p.totalGross,
        totalDeductions: p.totalDeductions,
        totalNet: p.totalNet,
        createdAt: p.createdAt,
      },
      update: {
        name: p.name,
        status: p.status,
        employeeCount: p.employeeCount,
        totalGross: p.totalGross,
        totalDeductions: p.totalDeductions,
        totalNet: p.totalNet,
      },
    });
  }

  const junId = stableId("period:2026-06");
  const mayId = stableId("period:2026-05");
  const aprId = stableId("period:2026-04");
  const julId = stableId("period:2026-07");


  // Funding models: Juni WC optional path, others client-funded
  await prisma.payrollPeriod.update({
    where: { id: junId },
    data: {
      fundingModel: "WORKING_CAPITAL",
      fundingStatus: "APPROVED",
      paymentInstructionStatus: "READY",
      reconciliationStatus: "NOT_STARTED",
      executionType: "PROQPAY_MANAGED_TRANSFER",
      sourceBankAccountId: stableId("bank:mandiri"),
    },
  });
  for (const pid of [mayId, aprId]) {
    await prisma.payrollPeriod.update({
      where: { id: pid },
      data: {
        fundingModel: "SELF_FUNDED",
        fundingStatus: "NOT_REQUIRED",
        paymentInstructionStatus: "EXECUTED",
        reconciliationStatus: "RECONCILED",
        executionType: "CLIENT_BANK_TRANSFER",
        sourceBankAccountId: stableId("bank:mandiri"),
      },
    });
  }
  await prisma.payrollPeriod.update({
    where: { id: julId },
    data: {
      fundingModel: "SELF_FUNDED",
      fundingStatus: "NOT_REQUIRED",
      paymentInstructionStatus: "NOT_STARTED",
      reconciliationStatus: "NOT_STARTED",
      executionType: "CLIENT_BANK_TRANSFER",
    },
  });

  // Payroll lines for Juni 2026
  for (let index = 0; index < employeesSeed.length; index++) {
    const e = employeesSeed[index];
    const empId = stableId(`employee:${e.code}`);
    const allowances = Math.round(e.baseSalary * 0.15);
    const overtime = index % 3 === 0 ? 750000 : 0;
    const bonuses = index % 4 === 0 ? 1000000 : 0;
    const deductions = 150000;
    const tax = Math.round(e.baseSalary * 0.05);
    const bpjs = Math.round(e.baseSalary * 0.04);
    const netPay =
      e.baseSalary + allowances + overtime + bonuses - deductions - tax - bpjs;
    const lineId = stableId(`line:${junId}:${e.code}`);

    await prisma.payrollLine.upsert({
      where: { id: lineId },
      create: {
        id: lineId,
        payrollPeriodId: junId,
        employeeId: empId,
        employeeName: e.name,
        department: e.department,
        baseSalary: e.baseSalary,
        allowances,
        overtime,
        bonuses,
        deductions,
        tax,
        bpjs,
        netPay,
      },
      update: {
        employeeName: e.name,
        department: e.department,
        baseSalary: e.baseSalary,
        allowances,
        overtime,
        bonuses,
        deductions,
        tax,
        bpjs,
        netPay,
      },
    });
  }

  const approvals = [
    {
      id: stableId("approval:1"),
      level: 1,
      approverName: "Siti Rahayu",
      role: "PAYROLL_ADMIN" as const,
      status: "APPROVED" as const,
      comment: "Payroll validated against attendance.",
      actedAt: new Date("2026-06-28T07:20:00.000Z"),
      userId: userIds.siti,
    },
    {
      id: stableId("approval:2"),
      level: 2,
      approverName: "Budi Santoso",
      role: "FINANCE" as const,
      status: "APPROVED" as const,
      comment: "Cost center check completed.",
      actedAt: new Date("2026-06-29T03:05:00.000Z"),
      userId: userIds.budi,
    },
    {
      id: stableId("approval:3"),
      level: 3,
      approverName: "Rina Kusuma",
      role: "APPROVER" as const,
      status: "PENDING" as const,
      comment: null,
      actedAt: null,
      userId: userIds.rina,
    },
    {
      id: stableId("approval:4"),
      level: 4,
      approverName: "Andi Wijaya",
      role: "DIRECTOR" as const,
      status: "PENDING" as const,
      comment: null,
      actedAt: null,
      userId: userIds.andi,
    },
  ];

  for (const a of approvals) {
    await prisma.approvalStep.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        payrollPeriodId: junId,
        level: a.level,
        approverName: a.approverName,
        role: a.role,
        status: a.status,
        comment: a.comment,
        actedAt: a.actedAt,
        userId: a.userId,
      },
      update: {
        status: a.status,
        comment: a.comment,
        actedAt: a.actedAt,
      },
    });
  }

  const disbursements = [
    {
      id: stableId("disb:may"),
      payrollPeriodId: mayId,
      periodName: "Mei 2026",
      bankName: "Bank Mandiri",
      totalAmount: 121600000,
      itemCount: 12,
      status: "PAID" as const,
      referenceNumber: "TRF-MND-20260605-88421",
      createdAt: new Date("2026-06-04T09:00:00.000Z"),
      processedAt: new Date("2026-06-05T01:12:00.000Z"),
    },
    {
      id: stableId("disb:apr"),
      payrollPeriodId: aprId,
      periodName: "April 2026",
      bankName: "BCA",
      totalAmount: 111600000,
      itemCount: 11,
      status: "PAID" as const,
      referenceNumber: "TRF-BCA-20260505-77102",
      createdAt: new Date("2026-05-04T08:30:00.000Z"),
      processedAt: new Date("2026-05-05T00:45:00.000Z"),
    },
    {
      id: stableId("disb:jun"),
      payrollPeriodId: junId,
      periodName: "Juni 2026",
      bankName: "Bank Mandiri",
      totalAmount: 123750000,
      itemCount: 12,
      status: "PENDING" as const,
      referenceNumber: "TRF-MND-20260705-PREP01",
      createdAt: new Date("2026-06-30T04:00:00.000Z"),
      processedAt: null,
    },
  ];

  for (const d of disbursements) {
    await prisma.disbursementBatch.upsert({
      where: { id: d.id },
      create: d,
      update: {
        status: d.status,
        totalAmount: d.totalAmount,
        itemCount: d.itemCount,
        processedAt: d.processedAt,
      },
    });
  }

  const wcs = [
    {
      id: stableId("wc:jun"),
      payrollPeriodId: junId,
      periodName: "Juni 2026",
      requestedAmount: 80000000,
      approvedAmount: 75000000,
      status: "APPROVED" as const,
      requestedAt: new Date("2026-06-27T02:00:00.000Z"),
      dueDate: new Date("2026-07-20"),
      repaidAmount: 0,
    },
    {
      id: stableId("wc:may"),
      payrollPeriodId: mayId,
      periodName: "Mei 2026",
      requestedAmount: 60000000,
      approvedAmount: 60000000,
      status: "REPAID" as const,
      requestedAt: new Date("2026-05-26T03:00:00.000Z"),
      dueDate: new Date("2026-06-18"),
      repaidAmount: 60000000,
    },
    {
      id: stableId("wc:jul"),
      payrollPeriodId: julId,
      periodName: "Juli 2026",
      requestedAmount: 90000000,
      approvedAmount: 0,
      status: "REQUESTED" as const,
      requestedAt: new Date("2026-07-18T01:30:00.000Z"),
      dueDate: new Date("2026-08-15"),
      repaidAmount: 0,
    },
  ];

  for (const w of wcs) {
    await prisma.workingCapitalRequest.upsert({
      where: { id: w.id },
      create: w,
      update: {
        status: w.status,
        requestedAmount: w.requestedAmount,
        approvedAmount: w.approvedAmount,
        repaidAmount: w.repaidAmount,
      },
    });
  }

  const audits = [
    {
      id: stableId("audit:1"),
      userName: "Siti Rahayu",
      userRole: "PAYROLL_ADMIN" as const,
      action: "GENERATE_PAYROLL",
      entity: "PayrollPeriod",
      entityId: junId,
      timestamp: new Date("2026-06-28T02:05:00.000Z"),
      ip: "103.24.xx.xx",
      userId: userIds.siti,
    },
    {
      id: stableId("audit:2"),
      userName: "Siti Rahayu",
      userRole: "PAYROLL_ADMIN" as const,
      action: "SUBMIT_FOR_APPROVAL",
      entity: "PayrollPeriod",
      entityId: junId,
      timestamp: new Date("2026-06-28T07:20:00.000Z"),
      ip: "103.24.xx.xx",
      userId: userIds.siti,
    },
    {
      id: stableId("audit:3"),
      userName: "Budi Santoso",
      userRole: "FINANCE" as const,
      action: "APPROVE_PAYROLL",
      entity: "ApprovalStep",
      entityId: stableId("approval:2"),
      timestamp: new Date("2026-06-29T03:05:00.000Z"),
      ip: "103.24.xx.yy",
      userId: userIds.budi,
    },
    {
      id: stableId("audit:4"),
      userName: "Dewi Lestari",
      userRole: "HR" as const,
      action: "UPDATE_EMPLOYEE",
      entity: "Employee",
      entityId: stableId("employee:MSG-1006"),
      timestamp: new Date("2026-06-25T06:40:00.000Z"),
      ip: "103.24.xx.zz",
      userId: userIds.dewi,
    },
    {
      id: stableId("audit:5"),
      userName: "MSG Super Admin",
      userRole: "SUPER_ADMIN" as const,
      action: "UPDATE_ROLE",
      entity: "User",
      entityId: userIds.rina,
      timestamp: new Date("2026-06-20T09:00:00.000Z"),
      ip: "10.0.0.12",
      userId: userIds.admin,
    },
    {
      id: stableId("audit:6"),
      userName: "Siti Rahayu",
      userRole: "PAYROLL_ADMIN" as const,
      action: "CREATE_DISBURSEMENT_BATCH",
      entity: "DisbursementBatch",
      entityId: stableId("disb:jun"),
      timestamp: new Date("2026-06-30T04:00:00.000Z"),
      ip: "103.24.xx.xx",
      userId: userIds.siti,
    },
    {
      id: stableId("audit:7"),
      userName: "Budi Santoso",
      userRole: "FINANCE" as const,
      action: "REQUEST_WORKING_CAPITAL",
      entity: "WorkingCapitalRequest",
      entityId: stableId("wc:jun"),
      timestamp: new Date("2026-06-27T02:00:00.000Z"),
      ip: "103.24.xx.yy",
      userId: userIds.budi,
    },
    {
      id: stableId("audit:8"),
      userName: "Andi Wijaya",
      userRole: "DIRECTOR" as const,
      action: "APPROVE_WORKING_CAPITAL",
      entity: "WorkingCapitalRequest",
      entityId: stableId("wc:jun"),
      timestamp: new Date("2026-06-27T08:30:00.000Z"),
      ip: "10.0.0.5",
      userId: userIds.andi,
    },
  ];

  for (const a of audits) {
    await prisma.auditLog.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        companyId: COMPANY_ID,
        userId: a.userId,
        userName: a.userName,
        userRole: a.userRole,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        timestamp: a.timestamp,
        ip: a.ip,
      },
      update: {
        action: a.action,
        timestamp: a.timestamp,
      },
    });
  }


  // Payment instruction (simulated banking) for Juni WC path
  const piId = stableId("pi:jun");
  await prisma.paymentInstruction.upsert({
    where: { id: piId },
    create: {
      id: piId,
      companyId: COMPANY_ID,
      payrollPeriodId: junId,
      instructionNumber: "PI-2026-06-001",
      fundingModel: "WORKING_CAPITAL",
      executionType: "PROQPAY_MANAGED_TRANSFER",
      integrationStatus: "SIMULATED",
      sourceBankAccountId: stableId("bank:mandiri"),
      totalRecords: 12,
      totalAmount: 123750000,
      currency: "IDR",
      approvalStatus: "APPROVED",
      executionStatus: "READY",
      generatedById: userIds.siti,
      generatedAt: new Date("2026-06-30T04:00:00.000Z"),
      version: 1,
    },
    update: {
      totalAmount: 123750000,
      executionStatus: "READY",
      integrationStatus: "SIMULATED",
    },
  });

  // Working capital company link
  await prisma.workingCapitalRequest.updateMany({
    where: { payrollPeriodId: junId },
    data: {
      companyId: COMPANY_ID,
      requestNumber: "WC-2026-06-001",
      status: "APPROVED",
      tenorDays: 30,
      settlementStatus: "PENDING",
      createdById: userIds.budi,
      approvedById: userIds.andi,
    },
  });

  // Anonymized internal commercial seed (no real prospect names in tracked code)
  const allowConfidential = process.env.ALLOW_CONFIDENTIAL_SEED_DATA === "true";
  const prospects = allowConfidential
    ? [
        { name: "Prospect Confidential A", value: 2000000000, p: 40 },
        { name: "Prospect Confidential B", value: 2000000000, p: 35 },
        { name: "Prospect Confidential C", value: 200000000, p: 25 },
      ]
    : [
        { name: "Prospect A", value: 2000000000, p: 40 },
        { name: "Prospect B", value: 2000000000, p: 35 },
        { name: "Prospect C", value: 200000000, p: 25 },
      ];

  for (const [i, pr] of prospects.entries()) {
    const id = stableId(`sales:prospect:${i}`);
    const weighted = Math.round((pr.value * pr.p) / 100);
    await prisma.salesOpportunity.upsert({
      where: { id },
      create: {
        id,
        organizationId: ORG_ID,
        prospectName: pr.name,
        stage: i === 0 ? "PROPOSAL" : "DISCOVERY",
        estimatedPayrollValue: pr.value,
        probabilityPercentage: pr.p,
        weightedPipelineValue: weighted,
        fundingInterest: i !== 2,
        proposedFundingModel: i === 0 ? "WORKING_CAPITAL" : "SELF_FUNDED",
        salesOwnerUserId: userIds.admin,
        source: "internal-pipeline",
        notes: "Internal only — not for public display",
        status: "OPEN",
      },
      update: {
        estimatedPayrollValue: pr.value,
        probabilityPercentage: pr.p,
        weightedPipelineValue: weighted,
      },
    });
  }

  await prisma.pricingRule.upsert({
    where: { id: stableId("pricing:demo") },
    create: {
      id: stableId("pricing:demo"),
      companyId: COMPANY_ID,
      pricingType: "PERCENTAGE_OF_PAYROLL",
      percentageRate: 0.75,
      calculationBase: "NET_PAYROLL",
      effectiveFrom: new Date("2026-01-01"),
      status: "ACTIVE",
      notes: "Demo rate — internal",
      createdById: userIds.admin,
      approvedById: userIds.andi,
    },
    update: { status: "ACTIVE" },
  });

  const partnerId = stableId("partner:demo");
  await prisma.capitalPartner.upsert({
    where: { id: partnerId },
    create: {
      id: partnerId,
      organizationId: ORG_ID,
      legalName: "Demo Capital Partner Ltd",
      displayName: "Demo Funding Partner",
      status: "ACTIVE",
      agreementStatus: "SIGNED",
      committedCapital: 500000000,
      availableCapital: 350000000,
      maximumSingleExposure: 150000000,
      contactName: "Partner Desk",
      contactEmail: "partner@example.invalid",
      internalNotes: "Internal partner record",
    },
    update: {
      availableCapital: 350000000,
      status: "ACTIVE",
    },
  });

  const wcJun = await prisma.workingCapitalRequest.findFirst({
    where: { payrollPeriodId: junId },
  });
  if (wcJun) {
    await prisma.capitalAllocation.upsert({
      where: { id: stableId("alloc:jun") },
      create: {
        id: stableId("alloc:jun"),
        workingCapitalRequestId: wcJun.id,
        capitalPartnerId: partnerId,
        allocatedAmount: 75000000,
        allocationStatus: "APPROVED",
        platformFeeAmount: 1500000,
        revenueShareRate: 0.02,
        settlementStatus: "PENDING",
        repaymentDueDate: new Date("2026-07-20"),
      },
      update: {
        allocatedAmount: 75000000,
        allocationStatus: "APPROVED",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      id: stableId("audit:funding-model"),
      companyId: COMPANY_ID,
      userId: userIds.admin,
      userName: "MSG Super Admin",
      userRole: "SUPER_ADMIN",
      action: "CONFIGURE_FUNDING_MODEL",
      entity: "PayrollPeriod",
      entityId: junId,
      detail: "Set WORKING_CAPITAL path for Juni 2026 (optional funding branch)",
      timestamp: new Date(),
      ip: "10.0.0.12",
    },
  }).catch(() => undefined);

  console.log("Seed complete:", {
    organization: 1,
    company: 1,
    users: usersSeed.length,
    employees: employeesSeed.length,
    payrollPeriods: periods.length,
    payrollLines: employeesSeed.length,
    approvals: approvals.length,
    disbursements: disbursements.length,
    workingCapital: wcs.length,
    auditLogs: audits.length,
    bankAccounts: banks.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
