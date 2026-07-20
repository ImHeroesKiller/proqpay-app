import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { companySettings, users } from "@/lib/data/seed";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company, payroll rules, approval workflow, banks, roles, and users."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={companySettings.name} />
            <Row label="Legal" value={companySettings.legalName} />
            <Row label="NPWP" value={companySettings.npwp} />
            <Row label="Address" value={companySettings.address} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Default pay day" value={`Day ${companySettings.payDay}`} />
            <Row label="Currency" value={companySettings.currency} />
            <p className="text-xs text-muted-foreground">
              Allowances, deductions, and overtime formulas are configurable in
              future releases.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {companySettings.approvalLevels.map((level, index) => (
              <div
                key={level}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Badge variant="outline">L{index + 1}</Badge>
                {level}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {companySettings.bankAccounts.map((bank) => (
              <div
                key={bank.account}
                className="rounded-lg border border-border p-3"
              >
                <p className="font-medium">{bank.label}</p>
                <p className="text-muted-foreground">
                  {bank.bank} · {bank.account}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Users & roles (RBAC)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="px-2 py-2.5 font-medium">{user.name}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-2 py-2.5">
                        <Badge variant="secondary">
                          {user.role.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {user.department ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Architecture supports RBAC, MFA, and session timeout (8h JWT max
              age configured).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
