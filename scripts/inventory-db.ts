import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

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

const p = new PrismaClient();

async function main() {
  const counts = {
    organization: await p.organization.count(),
    company: await p.company.count(),
    user: await p.user.count(),
    employee: await p.employee.count(),
    payrollPeriod: await p.payrollPeriod.count(),
    payrollLine: await p.payrollLine.count(),
    project: await p.project.count(),
    salesOpportunity: await p.salesOpportunity.count(),
    auditLog: await p.auditLog.count(),
    paymentInstruction: await p.paymentInstruction.count(),
    paymentConfirmation: await p.paymentConfirmation.count(),
    disbursement: await p.disbursementBatch.count(),
    approvalStep: await p.approvalStep.count(),
    capitalPartner: await p.capitalPartner.count(),
    workingCapital: await p.workingCapitalRequest.count(),
    attendance: await p.attendanceRecord.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
  console.log(
    "companies",
    await p.company.findMany({
      select: { name: true, lifecycleStatus: true, clientType: true },
    }),
  );
  console.log(
    "users",
    await p.user.findMany({ select: { email: true, role: true } }),
  );
}

main().finally(() => p.$disconnect());
