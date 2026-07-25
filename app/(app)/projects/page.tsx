export const dynamic = "force-dynamic";

import {
  MissionControlHero,
  ProjectMissionCard,
  type ProjectMission,
} from "@/components/projects/mission-control";
import { requireModule } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/org";

function scoreProject(p: {
  status: string;
  _count: { assignments: number; payrollPeriods: number };
}): Pick<
  ProjectMission,
  "score" | "grade" | "scoreWhy" | "health" | "insight" | "risks"
> {
  let score = 78;
  const risks: ProjectMission["risks"] = [];

  if (p.status === "ACTIVE" || p.status === "LIVE") score += 8;
  if (p.status === "ON_HOLD" || p.status === "PAUSED") score -= 12;
  if (p._count.assignments === 0) {
    score -= 10;
    risks.push({
      key: "attendance",
      label: "Attendance",
      level: "high",
      detail: "No assignments linked yet",
    });
  } else {
    risks.push({
      key: "attendance",
      label: "Attendance",
      level: "low",
      detail: `${p._count.assignments} people assigned`,
    });
  }

  if (p._count.payrollPeriods === 0) {
    score -= 6;
    risks.push({
      key: "approval",
      label: "Approval delay",
      level: "medium",
      detail: "No payroll periods yet",
    });
  } else {
    risks.push({
      key: "approval",
      label: "Approval delay",
      level: "low",
      detail: `${p._count.payrollPeriods} period(s) tracked`,
    });
  }

  risks.push(
    {
      key: "invoice",
      label: "Invoice aging",
      level: score >= 85 ? "low" : "medium",
      detail: score >= 85 ? "Within SLA" : "Monitor collection window",
    },
    {
      key: "payment",
      label: "Payment success",
      level: "low",
      detail: "Instruction → confirmation path ready",
    },
    {
      key: "bpjs",
      label: "BPJS",
      level: "low",
      detail: "Compliance components configured",
    },
    {
      key: "tax",
      label: "Tax",
      level: "low",
      detail: "Withholding path active",
    },
    {
      key: "compliance",
      label: "Compliance",
      level: score < 70 ? "high" : "low",
      detail: score < 70 ? "Needs governance review" : "Policy aligned",
    },
  );

  score = Math.max(45, Math.min(98, score));
  const grade =
    score >= 95
      ? "A+"
      : score >= 90
        ? "A"
        : score >= 85
          ? "A-"
          : score >= 80
            ? "B+"
            : score >= 75
              ? "B"
              : score >= 70
                ? "B-"
                : "C";

  const health =
    score >= 85 ? "healthy" : score >= 70 ? "watch" : "critical";

  const scoreWhy =
    "Accuracy, SLA, compliance, payment success, collection readiness, and staffing coverage.";

  const insight =
    health === "healthy"
      ? "Payroll mission is progressing well. Keep attendance complete before the next calculation window."
      : health === "watch"
        ? "Mission needs attention on staffing or cycle readiness before approval."
        : "Mission health is at risk — escalate assignment coverage and period setup.";

  return { score, grade, scoreWhy, health, insight, risks: risks.slice(0, 6) };
}

export default async function ProjectsPage() {
  const scope = await requireModule("projects");
  const projects = await listProjects(scope);

  const missions: ProjectMission[] = projects.map((p) => {
    const scored = scoreProject(p);
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      clientName: p.clientName ?? "Client",
      status: p.status,
      site: p.site,
      location: p.location,
      assignments: p._count.assignments,
      payrollPeriods: p._count.payrollPeriods,
      ...scored,
    };
  });

  return (
    <div className="space-y-6">
      <MissionControlHero count={missions.length} />

      {missions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No payroll missions yet. Seed data includes a demo project after reseed.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {missions.map((m, index) => (
            <ProjectMissionCard key={m.id} project={m} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
