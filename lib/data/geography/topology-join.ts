/**
 * Canonical join between TopoJSON features (anggakhrsma/indonesia-map IDN.json)
 * and ProQPay operational city codes.
 *
 * Topology properties: NAME_1, NAME_2, ID_1, ID_2, HASC_2
 * ProQPay codes: ID-JK-JB style
 */

export type TopologyCityJoin = {
  cityCode: string;
  provinceCode: string;
  cityName: string;
  provinceName: string;
  /** HASC_2 from topology e.g. ID.JK.JB */
  hasc2: string;
  /** ID_2 numeric from topology */
  id2: number;
  /** NAME_1 in topology (e.g. Jakarta Raya) */
  topologyProvinceName: string;
  /** NAME_2 in topology */
  topologyCityName: string;
};

/** Operational cities we map today + topology identity */
export const OPERATIONAL_TOPOLOGY_JOINS: TopologyCityJoin[] = [
  {
    cityCode: "ID-JK-JB",
    provinceCode: "ID-JK",
    cityName: "Jakarta Barat",
    provinceName: "DKI Jakarta",
    hasc2: "ID.JK.JB",
    id2: 68,
    topologyProvinceName: "Jakarta Raya",
    topologyCityName: "Jakarta Barat",
  },
  {
    cityCode: "ID-JK-JP",
    provinceCode: "ID-JK",
    cityName: "Jakarta Pusat",
    provinceName: "DKI Jakarta",
    hasc2: "ID.JK.JP",
    id2: 69,
    topologyProvinceName: "Jakarta Raya",
    topologyCityName: "Jakarta Pusat",
  },
];

const byHasc = new Map(
  OPERATIONAL_TOPOLOGY_JOINS.map((j) => [j.hasc2, j]),
);
const byCityCode = new Map(
  OPERATIONAL_TOPOLOGY_JOINS.map((j) => [j.cityCode, j]),
);
const byId2 = new Map(OPERATIONAL_TOPOLOGY_JOINS.map((j) => [j.id2, j]));

export function joinByHasc2(hasc2: string | null | undefined) {
  if (!hasc2) return undefined;
  return byHasc.get(hasc2);
}

export function joinByCityCode(code: string | null | undefined) {
  if (!code) return undefined;
  return byCityCode.get(code);
}

export function joinById2(id2: number | null | undefined) {
  if (id2 == null) return undefined;
  return byId2.get(id2);
}

/** Normalize free-text city names to canonical code when possible. */
export function normalizeCityNameToCode(name: string): string | null {
  const n = name
    .toLowerCase()
    .replace(/^kota\s+/, "")
    .replace(/^kab(?:upaten)?\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (n === "jakarta barat" || n === "west jakarta") return "ID-JK-JB";
  if (n === "jakarta pusat" || n === "central jakarta") return "ID-JK-JP";
  if (n === "jakarta selatan" || n === "south jakarta") return "ID-JK-JS";
  if (n === "jakarta timur" || n === "east jakarta") return "ID-JK-JT";
  if (n === "jakarta utara" || n === "north jakarta") return "ID-JK-JU";
  return null;
}

export function hascFromCityCode(cityCode: string): string | null {
  return byCityCode.get(cityCode)?.hasc2 ?? null;
}
