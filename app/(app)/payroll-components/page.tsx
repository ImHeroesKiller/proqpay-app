export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/utils";

export default async function PayrollComponentsPage() {
  await requireModule("payroll");
  let components: {
    id: string;
    code: string;
    name: string;
    kind: string;
    calcMethod: string;
    defaultAmount: unknown;
    isTaxable: boolean;
    isActive: boolean;
    company: { name: string };
  }[] = [];
  try {
    components = await prisma.payrollComponent.findMany({
      orderBy: [{ companyId: "asc" }, { sortOrder: "asc" }],
      include: { company: { select: { name: true } } },
      take: 200,
    });
  } catch {
    components = [];
  }

  return (
    <div>
      <PageHeader
        title="Payroll Components"
        description="Katalog komponen gaji (earning, potongan, BPJS, PPh21) per client."
      />
      <Card className="p-5">
        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada komponen. Gunakan AI Scheme Builder untuk menyusun komponen, atau
            seed komponen standar per client.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Kode</th>
                  <th className="py-2">Nama</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Jenis</th>
                  <th className="py-2">Metode</th>
                  <th className="py-2">Default</th>
                  <th className="py-2">Pajak</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="py-2 font-medium">{c.code}</td>
                    <td className="py-2">{c.name}</td>
                    <td className="py-2">{c.company.name}</td>
                    <td className="py-2">{c.kind}</td>
                    <td className="py-2">{c.calcMethod}</td>
                    <td className="py-2">{formatRupiah(Number(c.defaultAmount))}</td>
                    <td className="py-2">{c.isTaxable ? "Ya" : "Tidak"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
