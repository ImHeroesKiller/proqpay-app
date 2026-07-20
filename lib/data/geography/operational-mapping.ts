/**
 * Controlled operational location mapping (Approach B).
 *
 * Source of truth for dashboard geography until structured geo columns exist.
 * Documented in docs/GEOGRAPHIC_DATA_MODEL.md and docs/INDONESIA_OPERATING_FOOTPRINT.md.
 *
 * Rules:
 * - Only map entities with explicit business decision.
 * - Prospects without target province → UNASSIGNED city/province, status PROSPECT.
 * - Never invent multi-country live operations.
 * - Do not use residential employee addresses.
 */

import type { GeoEntityStatus, GeoRef } from "@/lib/data/geography/types";

export type EntityLocationMap = {
  /** Match company name (exact) or project code */
  match: { companyName?: string; projectCode?: string; clientType?: string };
  geo: GeoRef;
  notes: string;
};

/**
 * Current known operational footprint (Indonesia-first, Year 1).
 * ATE managed payroll: DKI Jakarta / Jakarta Barat.
 * Internal MSG: DKI Jakarta / Jakarta Pusat (HQ processing — not client payroll KPI).
 * Prospects: Indonesia, province unassigned until BD confirms.
 */
export const OPERATIONAL_LOCATION_MAP: EntityLocationMap[] = [
  {
    match: { companyName: "PT Anak Tiga Emas" },
    geo: {
      countryCode: "ID",
      countryName: "Indonesia",
      provinceCode: "ID-JK",
      provinceName: "DKI Jakarta",
      cityCode: "ID-JK-JB",
      cityName: "Jakarta Barat",
      siteCode: "SITE-ATE-JAKBAR-01",
      siteName: "ATE Client Office — Jakarta Barat",
      status: "ACTIVE_OPERATION",
    },
    notes:
      "Primary existing client. Operational master for ATE-MPS-2026 (Approach B).",
  },
  {
    match: { projectCode: "ATE-MPS-2026" },
    geo: {
      countryCode: "ID",
      countryName: "Indonesia",
      provinceCode: "ID-JK",
      provinceName: "DKI Jakarta",
      cityCode: "ID-JK-JB",
      cityName: "Jakarta Barat",
      siteCode: "SITE-ATE-JAKBAR-01",
      siteName: "ATE Client Office — Jakarta Barat",
      status: "ACTIVE_OPERATION",
    },
    notes: "Active managed payroll project location.",
  },
  {
    match: { companyName: "ProQPay Internal Operations" },
    geo: {
      countryCode: "ID",
      countryName: "Indonesia",
      provinceCode: "ID-JK",
      provinceName: "DKI Jakarta",
      cityCode: "ID-JK-JP",
      cityName: "Jakarta Pusat",
      siteCode: "SITE-MSG-HO-01",
      siteName: "ProQPay Processing Center — Jakarta Pusat",
      status: "ACTIVE_OPERATION",
    },
    notes:
      "Internal headcount only. Excluded from existing-client payroll KPIs.",
  },
  {
    match: { projectCode: "INT-PQP-2026" },
    geo: {
      countryCode: "ID",
      countryName: "Indonesia",
      provinceCode: "ID-JK",
      provinceName: "DKI Jakarta",
      cityCode: "ID-JK-JP",
      cityName: "Jakarta Pusat",
      siteCode: "SITE-MSG-HO-01",
      siteName: "ProQPay Processing Center — Jakarta Pusat",
      status: "ACTIVE_OPERATION",
    },
    notes: "Internal payroll project.",
  },
  // Prospects — Indonesia only, no city/province until formal target assigned
  {
    match: { companyName: "PT Mitra Langgeng Sejati" },
    geo: unassignedProspect("ID", "Indonesia"),
    notes: "Prospect pipeline only — no live payroll, location unassigned.",
  },
  {
    match: { companyName: "PT Qjob Saka Gemilang" },
    geo: unassignedProspect("ID", "Indonesia"),
    notes: "Prospect pipeline only — no live payroll, location unassigned.",
  },
  {
    match: { companyName: "PT Oversea Global Group" },
    geo: unassignedProspect("ID", "Indonesia"),
    notes:
      "Prospect (name suggests regional interest). No multi-country live ops claimed.",
  },
];

function unassignedProspect(
  countryCode: string,
  countryName: string,
): GeoRef {
  return {
    countryCode,
    countryName,
    provinceCode: null,
    provinceName: "Unassigned",
    cityCode: null,
    cityName: "Unassigned",
    siteCode: null,
    siteName: null,
    status: "PROSPECT",
  };
}

export function resolveCompanyGeo(
  companyName: string,
  clientType?: string | null,
): GeoRef {
  const byName = OPERATIONAL_LOCATION_MAP.find(
    (m) => m.match.companyName === companyName,
  );
  if (byName) return byName.geo;

  if (clientType === "INTERNAL") {
    const internal = OPERATIONAL_LOCATION_MAP.find(
      (m) => m.match.companyName === "ProQPay Internal Operations",
    );
    if (internal) return internal.geo;
  }

  if (clientType === "PROSPECT") {
    return unassignedProspect("ID", "Indonesia");
  }

  // Unknown existing — country Indonesia, location unassigned (no invention)
  return {
    countryCode: "ID",
    countryName: "Indonesia",
    provinceCode: null,
    provinceName: "Unassigned",
    cityCode: null,
    cityName: "Unassigned",
    siteCode: null,
    siteName: null,
    status: "UNASSIGNED",
  };
}

export function resolveProjectGeo(
  projectCode: string,
  companyName: string,
  clientType?: string | null,
): GeoRef {
  const byCode = OPERATIONAL_LOCATION_MAP.find(
    (m) => m.match.projectCode === projectCode,
  );
  if (byCode) return byCode.geo;
  return resolveCompanyGeo(companyName, clientType);
}

export function isActiveOperation(status: GeoEntityStatus): boolean {
  return status === "ACTIVE_OPERATION";
}

export function isClientFacingActive(geo: GeoRef, clientType?: string | null) {
  return (
    geo.status === "ACTIVE_OPERATION" &&
    clientType !== "INTERNAL" &&
    clientType !== "PROSPECT"
  );
}
