export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteMasterData, saveMasterData } from "./actions";

const entities = [
  ["client", "Clients"],
  ["project", "Projects"],
  ["payrollGroup", "Payroll Setup"],
  ["payrollComponent", "Payroll Components"],
  ["branch", "Branches"],
  ["department", "Departments"],
  ["position", "Positions"],
  ["costCenter", "Cost Centers"],
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const input = "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm";
const label = "space-y-1 text-xs font-medium text-navy";

function notice(params: Record<string, string | string[] | undefined>) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (params.success) return <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Data berhasil disimpan.</div>;
  if (params.deleted) return <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Data berhasil dihapus.</div>;
  return null;
}

function DeleteButton({ entity, id }: { entity: string; id: string }) {
  return (
    <form action={deleteMasterData}>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <button className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Hapus</button>
    </form>
  );
}

export default async function MasterDataPage({ searchParams }: { searchParams: SearchParams }) {
  const scope = await requireSession();
  const params = await searchParams;
  const entity = typeof params.entity === "string" ? params.entity : "client";
  const editId = typeof params.edit === "string" ? params.edit : "";
  const companyFilter = scope.role === "SUPER_ADMIN" || scope.role === "DIRECTOR" ? {} : scope.companyId ? { id: scope.companyId } : { id: "__none__" };

  const [companies, projects, groups, components, branches, departments, positions, costCenters] = await Promise.all([
    prisma.company.findMany({ where: companyFilter, orderBy: { name: "asc" }, take: 100 }),
    prisma.project.findMany({ where: scope.companyId && scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR" ? { companyId: scope.companyId } : {}, include: { company: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.payrollGroup.findMany({ where: scope.companyId && scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR" ? { companyId: scope.companyId } : {}, include: { company: { select: { name: true } }, project: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.payrollComponent.findMany({ where: scope.companyId && scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR" ? { companyId: scope.companyId } : {}, include: { company: { select: { name: true } } }, orderBy: [{ companyId: "asc" }, { sortOrder: "asc" }], take: 300 }),
    prisma.branch.findMany({ where: scope.companyId && scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR" ? { companyId: scope.companyId } : {}, include: { company: { select: { name: true } } }, orderBy: { name: "asc" }, take: 200 }),
    prisma.department.findMany({ where: scope.companyId && scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR" ? { companyId: scope.companyId } : {}, include: { company: { select: { name: true } } }, orderBy: { name: "asc" }, take: 200 }),
    prisma.position.findMany({ where: scope.companyId && scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR" ? { companyId: scope.companyId } : {}, include: { company: { select: { name: true } } }, orderBy: { name: "asc" }, take: 200 }),
    prisma.costCenter.findMany({ where: scope.companyId && scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR" ? { companyId: scope.companyId } : {}, include: { company: { select: { name: true } } }, orderBy: { name: "asc" }, take: 200 }),
  ]);

  const current = entity === "client" ? companies.find((x) => x.id === editId)
    : entity === "project" ? projects.find((x) => x.id === editId)
      : entity === "payrollGroup" ? groups.find((x) => x.id === editId)
        : entity === "payrollComponent" ? components.find((x) => x.id === editId)
          : entity === "branch" ? branches.find((x) => x.id === editId)
            : entity === "department" ? departments.find((x) => x.id === editId)
              : entity === "position" ? positions.find((x) => x.id === editId)
                : costCenters.find((x) => x.id === editId);

  const rows: any[] = entity === "client" ? companies : entity === "project" ? projects : entity === "payrollGroup" ? groups : entity === "payrollComponent" ? components : entity === "branch" ? branches : entity === "department" ? departments : entity === "position" ? positions : costCenters;

  return (
    <div className="space-y-5">
      <PageHeader title="Master Data Management" description="Tambah, ubah, nonaktifkan, dan hapus master operasional ProQPay dengan kontrol akses dan audit trail." />
      {notice(params)}
      <div className="flex flex-wrap gap-2">
        {entities.map(([key, title]) => <Link key={key} href={`/master-data?entity=${key}`} className={`rounded-xl border px-3 py-2 text-sm font-medium ${entity === key ? "border-navy bg-navy text-white" : "bg-white text-navy hover:bg-muted"}`}>{title}</Link>)}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-bold text-navy">{editId ? "Edit" : "Tambah"} {entities.find(([key]) => key === entity)?.[1]}</h2>{editId && <Link href={`/master-data?entity=${entity}`} className="text-sm text-orange hover:underline">Batal edit</Link>}</div>
        <form action={saveMasterData} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="id" value={editId} />

          {entity !== "client" && <label className={label}>Client<select name="companyId" required defaultValue={(current as any)?.companyId ?? scope.companyId ?? companies[0]?.id ?? ""} className={input}><option value="">Pilih client</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}

          {entity === "client" ? <>
            <label className={label}>Nama client<input name="name" required defaultValue={(current as any)?.name ?? ""} className={input} /></label>
            <label className={label}>Nama legal<input name="legalName" defaultValue={(current as any)?.legalName ?? ""} className={input} /></label>
            <label className={label}>NPWP<input name="npwp" defaultValue={(current as any)?.npwp ?? ""} className={input} /></label>
            <label className={label}>Industri<input name="industry" defaultValue={(current as any)?.industry ?? ""} className={input} /></label>
            <label className={label}>Lifecycle<select name="lifecycleStatus" defaultValue={(current as any)?.lifecycleStatus ?? "ACTIVE"} className={input}>{["LEAD","PROSPECT","ONBOARDING","ACTIVE","SUSPENDED","INACTIVE","ARCHIVED"].map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className={label}>Funding model<select name="defaultFundingModel" defaultValue={(current as any)?.defaultFundingModel ?? "SELF_FUNDED"} className={input}><option>SELF_FUNDED</option><option>WORKING_CAPITAL</option></select></label>
            <label className={`${label} md:col-span-2`}>Alamat<input name="address" defaultValue={(current as any)?.address ?? ""} className={input} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="fundingEnabled" defaultChecked={(current as any)?.fundingEnabled ?? true} /> Funding aktif</label>
          </> : entity === "project" ? <>
            <label className={label}>Kode<input name="code" required defaultValue={(current as any)?.code ?? ""} className={input} /></label>
            <label className={label}>Nama project<input name="name" required defaultValue={(current as any)?.name ?? ""} className={input} /></label>
            <label className={label}>Status<select name="status" defaultValue={(current as any)?.status ?? "ACTIVE"} className={input}>{["DRAFT","ACTIVE","ON_HOLD","COMPLETED","CANCELLED"].map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className={label}>Site<input name="site" defaultValue={(current as any)?.site ?? ""} className={input} /></label>
            <label className={label}>Lokasi<input name="location" defaultValue={(current as any)?.location ?? ""} className={input} /></label>
            <label className={label}>Contract ref<input name="contractRef" defaultValue={(current as any)?.contractRef ?? ""} className={input} /></label>
            <label className={label}>Service type<input name="serviceType" defaultValue={(current as any)?.serviceType ?? ""} className={input} /></label>
            <label className={label}>Operational PIC<input name="operationalPic" defaultValue={(current as any)?.operationalPic ?? ""} className={input} /></label>
            <label className={label}>Headcount quota<input name="headcountQuota" type="number" min="0" defaultValue={(current as any)?.headcountQuota ?? ""} className={input} /></label>
            <label className={label}>Budget<input name="projectBudget" type="number" min="0" defaultValue={(current as any)?.projectBudget?.toString?.() ?? ""} className={input} /></label>
          </> : entity === "payrollGroup" ? <>
            <label className={label}>Kode<input name="code" required defaultValue={(current as any)?.code ?? ""} className={input} /></label>
            <label className={label}>Nama group<input name="name" required defaultValue={(current as any)?.name ?? ""} className={input} /></label>
            <label className={label}>Project<select name="projectId" defaultValue={(current as any)?.projectId ?? ""} className={input}><option value="">Tanpa project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>
            <label className={label}>Worker type<select name="workerType" defaultValue={(current as any)?.workerType ?? "MONTHLY"} className={input}><option>MONTHLY</option><option>DAILY</option><option>HOURLY</option><option>CONTRACT</option></select></label>
            <label className={label}>Pay cycle<select name="payCycle" defaultValue={(current as any)?.payCycle ?? "MONTHLY"} className={input}><option>MONTHLY</option><option>WEEKLY</option><option>BIWEEKLY</option></select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={(current as any)?.isActive ?? true} /> Aktif</label>
          </> : entity === "payrollComponent" ? <>
            <label className={label}>Kode<input name="code" required defaultValue={(current as any)?.code ?? ""} className={input} /></label>
            <label className={label}>Nama komponen<input name="name" required defaultValue={(current as any)?.name ?? ""} className={input} /></label>
            <label className={label}>Jenis<select name="kind" defaultValue={(current as any)?.kind ?? "ALLOWANCE"} className={input}>{["BASIC","ALLOWANCE","TRANSPORT","MEAL","OVERTIME","BONUS","INCENTIVE","COMMISSION","LOAN","DEDUCTION","FINE","OTHER_INCOME","OTHER_DEDUCTION","BPJS_EMPLOYEE","BPJS_EMPLOYER","PPH21"].map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className={label}>Metode<select name="calcMethod" defaultValue={(current as any)?.calcMethod ?? "FIXED"} className={input}>{["FIXED","PERCENT_OF_BASIC","PERCENT_OF_GROSS","FORMULA","ATTENDANCE_BASED"].map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className={label}>Default amount<input name="defaultAmount" type="number" defaultValue={(current as any)?.defaultAmount?.toString?.() ?? 0} className={input} /></label>
            <label className={label}>Percent rate<input name="percentRate" type="number" step="0.0001" defaultValue={(current as any)?.percentRate?.toString?.() ?? ""} className={input} /></label>
            <label className={label}>Sort order<input name="sortOrder" type="number" defaultValue={(current as any)?.sortOrder ?? 0} className={input} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isTaxable" defaultChecked={(current as any)?.isTaxable ?? true} /> Kena pajak</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={(current as any)?.isActive ?? true} /> Aktif</label>
          </> : <>
            <label className={label}>Kode<input name="code" required defaultValue={(current as any)?.code ?? ""} className={input} /></label>
            <label className={label}>Nama<input name="name" required defaultValue={(current as any)?.name ?? ""} className={input} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={(current as any)?.isActive ?? true} /> Aktif</label>
          </>}
          <div className="flex items-end"><button className="h-10 rounded-xl bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90">{editId ? "Simpan perubahan" : "Tambah data"}</button></div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4"><h2 className="font-display text-lg font-bold text-navy">Daftar {entities.find(([key]) => key === entity)?.[1]}</h2><p className="text-sm text-muted-foreground">{rows.length} data ditampilkan.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Kode/Nama</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status/Detail</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody>{rows.map((row: any) => <tr key={row.id} className="border-t"><td className="px-4 py-3"><div className="font-semibold text-navy">{row.code ? `${row.code} · ` : ""}{row.name}</div><div className="text-xs text-muted-foreground">{row.legalName ?? row.kind ?? row.workerType ?? row.location ?? "—"}</div></td><td className="px-4 py-3">{row.company?.name ?? (entity === "client" ? row.name : "—")}</td><td className="px-4 py-3"><Badge variant="secondary">{row.lifecycleStatus ?? row.status ?? (row.isActive ? "ACTIVE" : "INACTIVE")}</Badge></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Link href={`/master-data?entity=${entity}&edit=${row.id}`} className="rounded-lg border px-2 py-1 text-xs font-medium text-navy hover:bg-muted">Edit</Link><DeleteButton entity={entity} id={row.id} /></div></td></tr>)}{rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Belum ada data.</td></tr>}</tbody></table></div>
      </Card>
    </div>
  );
}
