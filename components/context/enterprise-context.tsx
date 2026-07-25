"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type EnterpriseSelection = {
  organizationId: string | "ALL";
  clientId: string | "ALL";
  projectId: string | "ALL";
  payrollGroupId: string | "ALL";
  periodId: string | "ALL";
};

type Option = { id: string; label: string };

type Ctx = {
  selection: EnterpriseSelection;
  setSelection: (patch: Partial<EnterpriseSelection>) => void;
  organizations: Option[];
  clients: Option[];
  projects: Option[];
  payrollGroups: Option[];
  periods: Option[];
};

const EnterpriseContext = createContext<Ctx | null>(null);

export function EnterpriseContextProvider({
  children,
  organizations = [],
  clients = [],
  projects = [],
  payrollGroups = [],
  periods = [],
  initial,
}: {
  children: ReactNode;
  organizations?: Option[];
  clients?: Option[];
  projects?: Option[];
  payrollGroups?: Option[];
  periods?: Option[];
  initial?: Partial<EnterpriseSelection>;
}) {
  const [selection, setSel] = useState<EnterpriseSelection>({
    organizationId: initial?.organizationId ?? "ALL",
    clientId: initial?.clientId ?? "ALL",
    projectId: initial?.projectId ?? "ALL",
    payrollGroupId: initial?.payrollGroupId ?? "ALL",
    periodId: initial?.periodId ?? "ALL",
  });

  const value = useMemo<Ctx>(
    () => ({
      selection,
      setSelection: (patch) => setSel((s) => ({ ...s, ...patch })),
      organizations,
      clients,
      projects,
      payrollGroups,
      periods,
    }),
    [selection, organizations, clients, projects, payrollGroups, periods],
  );

  return (
    <EnterpriseContext.Provider value={value}>{children}</EnterpriseContext.Provider>
  );
}

export function useEnterpriseContext() {
  const ctx = useContext(EnterpriseContext);
  if (!ctx) {
    return {
      selection: {
        organizationId: "ALL" as const,
        clientId: "ALL" as const,
        projectId: "ALL" as const,
        payrollGroupId: "ALL" as const,
        periodId: "ALL" as const,
      },
      setSelection: () => undefined,
      organizations: [] as Option[],
      clients: [] as Option[],
      projects: [] as Option[],
      payrollGroups: [] as Option[],
      periods: [] as Option[],
    };
  }
  return ctx;
}

export function EnterpriseContextBar() {
  const {
    selection,
    setSelection,
    organizations,
    clients,
    projects,
    payrollGroups,
    periods,
  } = useEnterpriseContext();

  const selectClass =
    "h-8 max-w-[160px] rounded-lg border border-border/80 bg-[#F7F8FC] px-2 text-[12px] text-navy";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-white px-4 py-2 sm:px-6 lg:px-8">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Konteks
      </span>
      <select
        className={selectClass}
        value={selection.organizationId}
        onChange={(e) => setSelection({ organizationId: e.target.value })}
        aria-label="Organisasi"
      >
        <option value="ALL">Semua organisasi</option>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={selection.clientId}
        onChange={(e) =>
          setSelection({ clientId: e.target.value, projectId: "ALL" })
        }
        aria-label="Client"
      >
        <option value="ALL">Semua client</option>
        {clients.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={selection.projectId}
        onChange={(e) => setSelection({ projectId: e.target.value })}
        aria-label="Project"
      >
        <option value="ALL">Semua project</option>
        {projects.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={selection.payrollGroupId}
        onChange={(e) => setSelection({ payrollGroupId: e.target.value })}
        aria-label="Payroll group"
      >
        <option value="ALL">Semua group</option>
        {payrollGroups.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={selection.periodId}
        onChange={(e) => setSelection({ periodId: e.target.value })}
        aria-label="Periode payroll"
      >
        <option value="ALL">Semua periode</option>
        {periods.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
