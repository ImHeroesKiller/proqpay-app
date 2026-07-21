/** Geographic status for Indonesia operating footprint. */
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

/** Dashboard filters — Indonesia only (no country selector). */
export type GeoFilters = {
  province?: string | null;
  city?: string | null;
  site?: string | null;
  /** client | internal | all — default client */
  scope?: string | null;
  clientType?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  periodId?: string | null;
  payrollStatus?: string | null;
  fundingType?: string | null;
  currency?: string | null;
};
