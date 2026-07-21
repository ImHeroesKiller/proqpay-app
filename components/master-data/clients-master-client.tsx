"use client";

import { MasterDataCrudShell } from "@/components/master-data/master-data-crud";

export function ClientsMasterClient({ canManage }: { canManage: boolean }) {
  return (
    <MasterDataCrudShell
      title="Clients"
      description="Billing party for payroll processing and invoicing."
      endpoint="/api/master-data/clients"
      canManage={canManage}
      emptyTitle="No clients"
      columns={[
        { key: "name", label: "Name" },
        { key: "billingName", label: "Billing name" },
        { key: "npwp", label: "NPWP" },
        { key: "defaultCurrency", label: "Currency" },
        { key: "lifecycleStatus", label: "Status" },
        { key: "employees", label: "Employees" },
      ]}
      createFields={[
        { key: "name", label: "Name", required: true },
        { key: "legalName", label: "Legal name" },
        { key: "billingName", label: "Billing name" },
        { key: "npwp", label: "NPWP" },
        { key: "defaultCurrency", label: "Currency", placeholder: "IDR" },
        { key: "paymentTermsDays", label: "Payment terms (days)", type: "number" },
        { key: "billingContactName", label: "Billing contact" },
        { key: "billingContactEmail", label: "Billing email" },
        { key: "billingContactPhone", label: "Billing phone" },
        { key: "lifecycleStatus", label: "Lifecycle status", placeholder: "ACTIVE" },
      ]}
      mapRow={(item) => {
        const count = item._count as { employees?: number } | undefined;
        return {
          name: String(item.name ?? ""),
          billingName: String(item.billingName ?? item.name ?? ""),
          npwp: String(item.npwp ?? "—"),
          defaultCurrency: String(item.defaultCurrency ?? "IDR"),
          lifecycleStatus: String(item.lifecycleStatus ?? ""),
          employees: String(count?.employees ?? 0),
        };
      }}
      buildCreateBody={(form) => ({
        name: form.name,
        legalName: form.legalName || undefined,
        billingName: form.billingName || form.name,
        npwp: form.npwp || undefined,
        defaultCurrency: form.defaultCurrency || "IDR",
        paymentTermsDays: form.paymentTermsDays
          ? Number(form.paymentTermsDays)
          : 30,
        billingContactName: form.billingContactName || undefined,
        billingContactEmail: form.billingContactEmail || undefined,
        billingContactPhone: form.billingContactPhone || undefined,
        lifecycleStatus: form.lifecycleStatus || undefined,
      })}
    />
  );
}
