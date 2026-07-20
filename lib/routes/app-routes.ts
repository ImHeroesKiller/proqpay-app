/**
 * Central route builders for dashboard navigation hub.
 * Keep filter context in query strings where list pages support them.
 */

export type DashboardQuery = {
  province?: string | null;
  city?: string | null;
  site?: string | null;
  scope?: "client" | "internal" | "all" | null;
  clientType?: string | null;
  client?: string | null;
  project?: string | null;
  period?: string | null;
  status?: string | null;
  funding?: string | null;
};

function qs(
  params: Record<string, string | null | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "" || v === "ALL") continue;
    sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const routes = {
  dashboard(filters: DashboardQuery = {}) {
    return `/dashboard${qs({
      province: filters.province,
      city: filters.city,
      site: filters.site,
      scope: filters.scope,
      clientType: filters.clientType,
      client: filters.client,
      project: filters.project,
      period: filters.period,
      status: filters.status,
      funding: filters.funding,
    })}`;
  },

  payroll: {
    list(filters: {
      status?: string | null;
      clientType?: string | null;
      period?: string | null;
      scope?: string | null;
    } = {}) {
      return `/payroll${qs({
        status: filters.status,
        clientType: filters.clientType,
        period: filters.period,
        scope: filters.scope,
      })}`;
    },
    detail(id: string) {
      return `/payroll/${id}`;
    },
  },

  clients: {
    list(filters: { type?: string | null } = {}) {
      return `/clients${qs({ type: filters.type })}`;
    },
    detail(id: string) {
      return `/clients?highlight=${id}`;
    },
  },

  employees: {
    list(filters: {
      scope?: string | null;
      status?: string | null;
    } = {}) {
      return `/employees${qs({
        scope: filters.scope,
        status: filters.status,
      })}`;
    },
    detail(id: string) {
      return `/employees/${id}`;
    },
  },

  projects: {
    list() {
      return `/projects`;
    },
    detail(id: string) {
      return `/projects?highlight=${id}`;
    },
  },

  sales: {
    list(filters: { clientType?: string | null } = {}) {
      return `/sales${qs({ clientType: filters.clientType ?? "PROSPECT" })}`;
    },
    opportunity(id: string) {
      return `/sales?highlight=${id}`;
    },
  },

  approval: {
    list() {
      return `/approval`;
    },
  },

  paymentInstructions: {
    list() {
      return `/payment-instructions`;
    },
    detail(id: string) {
      return `/payment-instructions?highlight=${id}`;
    },
  },

  paymentConfirmation: {
    list() {
      return `/payment-confirmation`;
    },
  },

  disbursement: {
    list() {
      return `/disbursement`;
    },
  },

  audit: {
    list() {
      return `/audit`;
    },
  },
};
