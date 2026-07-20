"use client";

import { MasterDataCrudShell } from "@/components/master-data/master-data-crud";

export function SitesMasterClient({ canManage }: { canManage: boolean }) {
  return (
    <MasterDataCrudShell
      title="Sites"
      description="Operational site codes for payroll groups and assignments."
      endpoint="/api/master-data/sites"
      canManage={canManage}
      emptyTitle="No sites"
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "company", label: "Client" },
        { key: "city", label: "City" },
        { key: "status", label: "Status" },
      ]}
      createFields={[
        { key: "companyId", label: "Company ID (client)", required: true },
        { key: "code", label: "Code", required: true },
        { key: "name", label: "Name", required: true },
        { key: "projectId", label: "Project ID (optional)" },
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
        { key: "province", label: "Province" },
        { key: "postalCode", label: "Postal code" },
        { key: "timezone", label: "Timezone", placeholder: "Asia/Jakarta" },
      ]}
      mapRow={(item) => {
        const company = item.company as { name?: string } | undefined;
        return {
          code: String(item.code ?? ""),
          name: String(item.name ?? ""),
          company: String(company?.name ?? ""),
          city: String(item.city ?? "—"),
          status: String(item.status ?? ""),
        };
      }}
      buildCreateBody={(form) => ({
        companyId: form.companyId,
        code: form.code,
        name: form.name,
        projectId: form.projectId || null,
        address: form.address || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        postalCode: form.postalCode || undefined,
        timezone: form.timezone || "Asia/Jakarta",
      })}
    />
  );
}
