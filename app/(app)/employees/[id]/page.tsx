export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeeById } from "@/lib/data/queries";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployeeById(id);

  if (!employee) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={employee.name}
        description={`${employee.employeeCode} · ${employee.position}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/employees">Back to list</Link>
          </Button>
        }
      />

      <div className="mb-4">
        <StatusBadge status={employee.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Department" value={employee.department} />
            <Row label="Position" value={employee.position} />
            <Row label="Join date" value={formatDate(employee.joinDate)} />
            <Row label="Email" value={employee.email} />
            <Row label="Phone" value={employee.phone} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compensation & compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Base salary" value={formatRupiah(employee.baseSalary)} />
            <Row label="Bank" value={`${employee.bankName} · ${employee.bankAccount}`} />
            <Row label="Tax status" value={employee.taxStatus} />
            <Row label="BPJS" value={employee.bpjsNumber} />
            <Row label="NPWP" value={employee.npwp} />
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
