import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { employees } from "@/lib/data/seed";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = employees.find((e) => e.id === id);
  if (!employee) notFound();

  return (
    <div>
      <PageHeader
        title={employee.name}
        description={`${employee.employeeCode} · ${employee.position}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/employees">Back to directory</Link>
          </Button>
        }
      />

      <div className="mb-4">
        <StatusBadge status={employee.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Email" value={employee.email} />
            <Row label="Phone" value={employee.phone} />
            <Row label="Department" value={employee.department} />
            <Row label="Position" value={employee.position} />
            <Row label="Join date" value={formatDate(employee.joinDate)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Employment & salary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Status" value={employee.status} />
            <Row label="Base salary" value={formatRupiah(employee.baseSalary)} />
            <Row label="Tax status" value={employee.taxStatus} />
            <Row label="NPWP" value={employee.npwp} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bank account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Bank" value={employee.bankName} />
            <Row label="Account" value={employee.bankAccount} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>BPJS (placeholder)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="BPJS number" value={employee.bpjsNumber} />
            <p className="text-xs text-muted-foreground">
              Full BPJS administration module is on the product roadmap.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
