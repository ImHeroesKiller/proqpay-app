import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { companyWhere } from "@/lib/auth/scope";
import {
  formatPayrollGroupLabel,
  getActivePayrollAssignment,
  prismaActiveAssignmentArgs,
} from "@/lib/employees/payroll-assignment";

export const EMPLOYEE_PAGE_SIZE = 25;

export type EmployeeListRow = {
  id: string;
  employeeCode: string;
  name: string;
  clientName: string;
  projectName: string;
  payrollGroupName: string;
  department: string;
  position: string;
  baseSalary: number;
  status: string;
  bankMasked: string;
  taxStatus: string;
  dataQuality: string;
};

type EmployeeListParams = {
  page?: number;
  query?: string;
};

export async function getEmployeeListPage(
  scope: SessionScope,
  params: EmployeeListParams = {},
) {
  const page = Math.max(1, Math.trunc(params.page ?? 1));
  const query = params.query?.trim().slice(0, 80) ?? "";
  const scopedWhere = companyWhere(scope);
  const searchWhere = query
    ? {
        OR: [
          { employeeCode: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
          { department: { contains: query, mode: "insensitive" as const } },
          { position: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  const where = { ...scopedWhere, ...searchWhere };
  const assignmentArgs = prismaActiveAssignmentArgs();

  const total = await prisma.employee.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / EMPLOYEE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const rows = await prisma.employee.findMany({
    where,
    orderBy: { employeeCode: "asc" },
    skip: (safePage - 1) * EMPLOYEE_PAGE_SIZE,
    take: EMPLOYEE_PAGE_SIZE,
    select: {
      id: true,
      employeeCode: true,
      name: true,
      department: true,
      position: true,
      baseSalary: true,
      status: true,
      bankAccount: true,
      taxStatus: true,
      npwp: true,
      bpjsNumber: true,
      company: { select: { name: true } },
      projectAssignments: {
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { project: { select: { name: true, code: true } } },
      },
      payrollAssignments: {
        where: assignmentArgs.where,
        orderBy: assignmentArgs.orderBy,
        take: assignmentArgs.take,
        select: {
          id: true,
          payrollGroupId: true,
          effectiveFrom: true,
          effectiveTo: true,
          isActive: true,
          status: true,
          payrollGroup: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });

  const data: EmployeeListRow[] = rows.map((row) => {
    const activeAssignment = getActivePayrollAssignment(row.payrollAssignments);
    const project = row.projectAssignments[0]?.project ?? activeAssignment?.project;
    const issues: string[] = [];
    if (!row.bankAccount || row.bankAccount === "-") issues.push("Bank");
    if (!row.npwp || row.npwp === "-") issues.push("NPWP");
    if (!row.bpjsNumber || row.bpjsNumber === "-") issues.push("BPJS");
    if (!activeAssignment?.payrollGroup) issues.push("Payroll group");

    return {
      id: row.id,
      employeeCode: row.employeeCode,
      name: row.name,
      clientName: row.company.name,
      projectName: project ? `${project.code} · ${project.name}` : "—",
      payrollGroupName: formatPayrollGroupLabel(activeAssignment) ?? "—",
      department: row.department,
      position: row.position,
      baseSalary: Number(row.baseSalary),
      status: row.status,
      bankMasked: row.bankAccount ? `****${row.bankAccount.slice(-4)}` : "—",
      taxStatus: row.taxStatus || "—",
      dataQuality: issues.length ? `Perlu: ${issues.join(", ")}` : "Lengkap",
    };
  });

  return {
    data,
    total,
    page: safePage,
    pageCount,
    pageSize: EMPLOYEE_PAGE_SIZE,
    query,
  };
}
