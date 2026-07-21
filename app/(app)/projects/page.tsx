export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/org";

export default async function ProjectsPage() {
  const scope = await requireModule("projects");
  const projects = await listProjects(scope);

  return (
    <div>
      <PageHeader
        eyebrow="Payroll operations"
        title="Projects"
        description="First-class project objects for event, outsourcing, security, cleaning, and site-based payroll. Employees and payroll periods can be linked to projects."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects yet. Create a managed payroll project for an active client.
          </p>
        ) : null}
        {projects.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {p.code} · {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Client · {p.clientName}
                  </p>
                </div>
                <Badge variant="secondary">{p.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {p.site ?? "Site n/a"} · {p.location ?? "Location n/a"}
              </p>
              <p className="text-xs text-muted-foreground">
                {p._count.assignments} assignments · {p._count.payrollPeriods}{" "}
                payroll periods
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
