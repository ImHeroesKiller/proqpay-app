import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let organizations: { id: string; label: string }[] = [];
  let clients: { id: string; label: string }[] = [];
  let projects: { id: string; label: string }[] = [];
  let payrollGroups: { id: string; label: string }[] = [];
  let periods: { id: string; label: string }[] = [];

  try {
    const [orgs, cos, projs, groups, pers] = await Promise.all([
      prisma.organization.findMany({
        orderBy: { name: "asc" },
        take: 50,
        select: { id: true, name: true },
      }),
      prisma.company.findMany({
        orderBy: { name: "asc" },
        take: 100,
        select: { id: true, name: true },
      }),
      prisma.project.findMany({
        orderBy: { name: "asc" },
        take: 200,
        select: { id: true, name: true, code: true },
      }),
      prisma.payrollGroup.findMany({
        orderBy: { name: "asc" },
        take: 100,
        select: { id: true, name: true, code: true },
      }).catch(() => [] as { id: string; name: string; code: string }[]),
      prisma.payrollPeriod.findMany({
        orderBy: { periodStart: "desc" },
        take: 40,
        select: { id: true, name: true },
      }),
    ]);
    organizations = orgs.map((o) => ({ id: o.id, label: o.name }));
    clients = cos.map((c) => ({ id: c.id, label: c.name }));
    projects = projs.map((p) => ({
      id: p.id,
      label: `${p.code} · ${p.name}`,
    }));
    payrollGroups = groups.map((g) => ({
      id: g.id,
      label: `${g.code} · ${g.name}`,
    }));
    periods = pers.map((p) => ({ id: p.id, label: p.name }));
  } catch {
    // Layout must render even if enterprise tables not yet migrated
  }

  return (
    <AppShell
      organizations={organizations}
      clients={clients}
      projects={projects}
      payrollGroups={payrollGroups}
      periods={periods}
    >
      {children}
    </AppShell>
  );
}
