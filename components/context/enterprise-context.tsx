"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type EnterpriseSelection = {
  organizationId: string | "ALL";
  clientId: string | "ALL";
  projectId: string | "ALL";
  payrollGroupId: string | "ALL";
  periodId: string | "ALL";
};

type Option = { id: string; label: string };
type OptionsPayload = {
  organizations: Option[];
  clients: Option[];
  projects: Option[];
  payrollGroups: Option[];
  periods: Option[];
};

type Ctx = OptionsPayload & {
  selection: EnterpriseSelection;
  setSelection: (patch: Partial<EnterpriseSelection>) => void;
  isLoading: boolean;
};

const emptyOptions: OptionsPayload = {
  organizations: [],
  clients: [],
  projects: [],
  payrollGroups: [],
  periods: [],
};

const EnterpriseContext = createContext<Ctx | null>(null);

export function EnterpriseContextProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Partial<EnterpriseSelection>;
}) {
  const [selection, setSel] = useState<EnterpriseSelection>({
    organizationId: initial?.organizationId ?? "ALL",
    clientId: initial?.clientId ?? "ALL",
    projectId: initial?.projectId ?? "ALL",
    payrollGroupId: initial?.payrollGroupId ?? "ALL",
    periodId: initial?.periodId ?? "ALL",
  });
  const [options, setOptions] = useState<OptionsPayload>(emptyOptions);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const response = await fetch("/api/context/options", {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as OptionsPayload;
        setOptions(payload);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load enterprise context options", error);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadOptions();
    return () => controller.abort();
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      selection,
      setSelection: (patch) => setSel((s) => ({ ...s, ...patch })),
      ...options,
      isLoading,
    }),
    [selection, options, isLoading],
  );

  return <EnterpriseContext.Provider value={value}>{children}</EnterpriseContext.Provider>;
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
      ...emptyOptions,
      isLoading: false,
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
    isLoading,
  } = useEnterpriseContext();

  const selectClass =
    "h-8 max-w-[160px] rounded-lg border border-border/80 bg-[#F7F8FC] px-2 text-[12px] text-navy disabled:cursor-wait disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-white px-4 py-2 sm:px-6 lg:px-8">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Konteks
      </span>
      <select
        disabled={isLoading}
        className={selectClass}
        value={selection.organizationId}
        onChange={(e) => setSelection({ organizationId: e.target.value })}
        aria-label="Organisasi"
      >
        <option value="ALL">{isLoading ? "Memuat organisasi…" : "Semua organisasi"}</option>
        {organizations.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <select
        disabled={isLoading}
        className={selectClass}
        value={selection.clientId}
        onChange={(e) => setSelection({ clientId: e.target.value, projectId: "ALL" })}
        aria-label="Client"
      >
        <option value="ALL">{isLoading ? "Memuat client…" : "Semua client"}</option>
        {clients.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <select
        disabled={isLoading}
        className={selectClass}
        value={selection.projectId}
        onChange={(e) => setSelection({ projectId: e.target.value })}
        aria-label="Project"
      >
        <option value="ALL">{isLoading ? "Memuat project…" : "Semua project"}</option>
        {projects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <select
        disabled={isLoading}
        className={selectClass}
        value={selection.payrollGroupId}
        onChange={(e) => setSelection({ payrollGroupId: e.target.value })}
        aria-label="Payroll group"
      >
        <option value="ALL">{isLoading ? "Memuat group…" : "Semua group"}</option>
        {payrollGroups.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <select
        disabled={isLoading}
        className={selectClass}
        value={selection.periodId}
        onChange={(e) => setSelection({ periodId: e.target.value })}
        aria-label="Periode payroll"
      >
        <option value="ALL">{isLoading ? "Memuat periode…" : "Semua periode"}</option>
        {periods.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}
