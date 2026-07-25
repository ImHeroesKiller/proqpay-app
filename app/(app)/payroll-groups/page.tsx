export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function PayrollGroupsPage() {
  await requireModule("payroll");
  let groups: {
    id: string;
    code: string;
    name: string;
    workerType: string;
    payCycle: string;
    isActive: boolean;
    company: { name: string };
    project: { name: string } | null;
    _count: { employeeAssignments: number };
  }[] = [];
  try {
    groups = await prisma.payrollGroup.findMany({
      orderBy: { name: "asc" },
      include: {
        company: { select: { name: true } },
        project: { select: { name: true } },
        _count: {
          select: {
            employeeAssignments: {
              where: { isActive: true },
            },
          },
        },
      },
    });
  } catch {
    groups = [];
  }

  return (
    <div>
      <PageHeader
        title="Payroll Groups"
        description="Kelompok payroll per client/project dan tipe pekerja."
      />
      <Card className="p-5">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada payroll group. Group dapat dibuat seiring onboarding client atau
            migrasi master data.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Kode</th>
                <th className="py-2">Nama</th>
                <th className="py-2">Client</th>
                <th className="py-2">Project</th>
                <th className="py-2">Tipe</th>
                <th className="py-2">Karyawan</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b border-border/60">
                  <td className="py-2 font-medium">{g.code}</td>
                  <td className="py-2">{g.name}</td>
                  <td className="py-2">{g.company.name}</td>
                  <td className="py-2">{g.project?.name ?? "—"}</td>
                  <td className="py-2">{g.workerType}</td>
                  <td className="py-2">{g._count.employeeAssignments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
