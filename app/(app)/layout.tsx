import { unstable_cache } from "next/cache";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";

type Option = { id: string; label: string };

type ShellOptions = {
  organizations: Option[];
  clients: Option[];
  projects: Option[];
  payrollGroups: Option[];
  periods: Option[];
};

const getShellOptions = unstable_cache(
  async (): Promise<ShellOptions> => {
    // These values populate global context selectors and change far less often
    // than users navigate. Read them sequentially to avoid exhausting the small
    // pooled connection limit, then reuse the result across warm requests.
    const orgs = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      take: 50,
      select: { id: true, name: true },
    });

    const cos = await prisma.company.findMany({
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true },
    });

    const projs = await prisma.project.findMany({
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, code: true },
    });

    const groups = await prisma.payrollGroup
      .findMany({
        orderBy: { name: "asc" },
        take: 100,
        select: { id: true, name: true, code: true },
      })
      .catch(() => [] as { id: string; name: string; code: string }[]);

    const pers = await prisma.payrollPeriod.findMany({
      orderBy: { periodStart: "desc" },
      take: 40,
      select: { id: true, name: true },
    });

    return {
      organizations: orgs.map((o) => ({ id: o.id, label: o.name })),
      clients: cos.map((c) => ({ id: c.id, label: c.name })),
      projects: projs.map((p) => ({
        id: p.id,
        label: `${p.code} · ${p.name}`,
      })),
      payrollGroups: groups.map((g) => ({
        id: g.id,
        label: `${g.code} · ${g.name}`,
      })),
      periods: pers.map((p) => ({ id: p.id, label: p.name })),
    };
  },
  ["authenticated-shell-options-v1"],
  { revalidate: 300, tags: ["shell-options"] },
);

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let options: ShellOptions = {
    organizations: [],
    clients: [],
    projects: [],
    payrollGroups: [],
    periods: [],
  };

  try {
    options = await getShellOptions();
  } catch {
    // The application shell must still render during a transient database issue.
  }

  return <AppShell {...options}>{children}</AppShell>;
}
