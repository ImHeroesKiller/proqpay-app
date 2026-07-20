/** Geographic status for operating footprint — never conflate plan with live ops. */
export type GeoEntityStatus =
  | "ACTIVE_OPERATION"
  | "PROSPECT"
  | "STRATEGIC_EXPANSION"
  | "INACTIVE"
  | "UNASSIGNED";

export type GeoRef = {
  countryCode: string;
  countryName: string;
  provinceCode: string | null;
  provinceName: string | null;
  cityCode: string | null;
  cityName: string | null;
  siteCode: string | null;
  siteName: string | null;
  status: GeoEntityStatus;
};

export type GeoFilters = {
  country?: string | null;
  province?: string | null;
  city?: string | null;
  site?: string | null;
  clientType?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  periodId?: string | null;
  payrollStatus?: string | null;
  currency?: string | null;
  fundingType?: string | null;
  /** national | global_readiness */
  viewMode?: "national" | "global_readiness";
};

export type OperationalEntityKey =
  | "company:name"
  | "project:code"
  | "clientType:internal";
