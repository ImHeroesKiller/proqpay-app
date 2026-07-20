export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { listAttendance } from "@/lib/data/org";
import { formatDate } from "@/lib/utils";

export default async function AttendancePage() {
  const scope = await requireModule("attendance");
  const rows = await listAttendance(scope);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Attendance summary for payroll calculation (present, leave, overtime). Import CSV/Excel and full adjustment workflows are staged; records below drive the payroll engine attendance factor when present."
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">OT</th>
                <th className="px-4 py-3">Project</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-muted-foreground"
                  >
                    No attendance records. Reseed to load demo attendance, or
                    import in a later release.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    {formatDate(r.workDate.toISOString())}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {r.employee.name}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{r.type}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {Number(r.hoursWorked)}
                  </td>
                  <td className="px-4 py-2.5">
                    {Number(r.overtimeHours)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.project?.name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
