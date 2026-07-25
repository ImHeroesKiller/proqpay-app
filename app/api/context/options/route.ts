import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const getOptions = unstable_cache(
  async () => {
    const orgs = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      take: 50,
      select: { id: true, name: true },
    });
    const clients = await prisma.company.findMany({
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true },
    });
    const projects = await prisma.project.findMany({
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, code: true },
    });
    const payrollGroups = await prisma.payrollGroup
      .findMany({
        orderBy: { name: "asc" },
        take: 100,
        select: { id: true, name: true, code: true },
      })
      .catch(() => [] as { id: string; name: string; code: string }[]);
    const periods = await prisma.payrollPeriod.findMany({
      orderBy: { periodStart: "desc" },
      take: 40,
      select: { id: true, name: true },
    });

    return {
      organizations: orgs.map((item) => ({ id: item.id, label: item.name })),
      clients: clients.map((item) => ({ id: item.id, label: item.name })),
      projects: projects.map((item) => ({
        id: item.id,
        label: `${item.code} · ${item.name}`,
      })),
      payrollGroups: payrollGroups.map((item) => ({
        id: item.id,
        label: `${item.code} · ${item.name}`,
      })),
      periods: periods.map((item) => ({ id: item.id, label: item.name })),
    };
  },
  ["enterprise-context-options-v2"],
  { revalidate: 300, tags: ["shell-options"] },
);

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const options = await getOptions();
    return NextResponse.json(options, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
      },
    });
  } catch (error) {
    console.error("Failed to load enterprise context options", error);
    return NextResponse.json(
      {
        organizations: [],
        clients: [],
        projects: [],
        payrollGroups: [],
        periods: [],
      },
      { status: 200 },
    );
  }
}
