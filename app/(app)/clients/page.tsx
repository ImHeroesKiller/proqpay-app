export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { getClients } from "@/lib/data/queries";
import { fundingModelLabel } from "@/lib/domain/workflow";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function ClientsPage() {
  const scope = await requireModule("clients");
  const clients = await getClients(scope);

  const stats = new Map<
    string,
    { projects: number; employees: number; activeEmployees: number }
  >();
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        _count: { select: { projects: true, employees: true } },
        employees: {
          where: { status: { in: ["ACTIVE", "PROBATION"] } },
          select: { id: true },
        },
      },
    });
    for (const c of companies) {
      stats.set(c.id, {
        projects: c._count.projects,
        employees: c._count.employees,
        activeEmployees: c.employees.length,
      });
    }
  } catch {
    // ignore
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Master client enterprise: lifecycle, headcount, managed payroll, dan status kontrak."
      />
      <p className="mb-4 text-sm text-muted-foreground">
        {clients.length} client dari database production (schema proqpay).
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => {
          const s = stats.get(c.id);
          return (
            <Card key={c.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.legalName ?? "—"}
                    </p>
                  </div>
                  <Badge variant="secondary">{c.lifecycleStatus}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {c.industry ?? "Industri n/a"} · Funding:{" "}
                  {fundingModelLabel(c.defaultFundingModel)}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-[#F7F8FC] p-2">
                    <div className="font-semibold text-navy">{s?.projects ?? 0}</div>
                    <div className="text-muted-foreground">Project</div>
                  </div>
                  <div className="rounded-lg bg-[#F7F8FC] p-2">
                    <div className="font-semibold text-navy">
                      {s?.activeEmployees ?? 0}
                    </div>
                    <div className="text-muted-foreground">Aktif</div>
                  </div>
                  <div className="rounded-lg bg-[#F7F8FC] p-2">
                    <div className="font-semibold text-navy">
                      {s?.employees ?? 0}
                    </div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  WC facility: {c.workingCapitalStatus}
                  {c.goLiveDate ? ` · Go-live ${c.goLiveDate}` : ""}
                </p>
                <Link
                  href={`/projects?client=${c.id}`}
                  className="text-xs font-medium text-orange hover:underline"
                >
                  Lihat project →
                </Link>
              </CardContent>
            </Card>
          );
        })}
        {clients.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada client. Pastikan koneksi database dan data master tersedia.
          </p>
        )}
      </div>
    </div>
  );
}
