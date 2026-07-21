/**
 * Master location reference — not the same as live operating footprint.
 * Codes are stable internal identifiers (ISO-like for country; BPS-style for ID provinces).
 */

export type CountryRef = {
  code: string;
  name: string;
};

export type ProvinceRef = {
  code: string;
  countryCode: string;
  name: string;
};

export type CityRef = {
  code: string;
  provinceCode: string;
  name: string;
};

export const COUNTRIES: CountryRef[] = [
  { code: "ID", name: "Indonesia" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "AU", name: "Australia" },
];

/** Indonesian provinces used for reference + Year 1–3 planning UI. */
export const ID_PROVINCES: ProvinceRef[] = [
  { code: "ID-JK", countryCode: "ID", name: "DKI Jakarta" },
  { code: "ID-JB", countryCode: "ID", name: "Jawa Barat" },
  { code: "ID-BT", countryCode: "ID", name: "Banten" },
  { code: "ID-JT", countryCode: "ID", name: "Jawa Tengah" },
  { code: "ID-JI", countryCode: "ID", name: "Jawa Timur" },
  { code: "ID-SU", countryCode: "ID", name: "Sumatera Utara" },
  { code: "ID-SS", countryCode: "ID", name: "Sumatera Selatan" },
  { code: "ID-KI", countryCode: "ID", name: "Kalimantan Timur" },
  { code: "ID-ST", countryCode: "ID", name: "Sulawesi Tengah" },
  { code: "ID-BA", countryCode: "ID", name: "Bali" },
];

export const ID_CITIES: CityRef[] = [
  // DKI Jakarta
  { code: "ID-JK-JB", provinceCode: "ID-JK", name: "Jakarta Barat" },
  { code: "ID-JK-JS", provinceCode: "ID-JK", name: "Jakarta Selatan" },
  { code: "ID-JK-JP", provinceCode: "ID-JK", name: "Jakarta Pusat" },
  { code: "ID-JK-JT", provinceCode: "ID-JK", name: "Jakarta Timur" },
  { code: "ID-JK-JU", provinceCode: "ID-JK", name: "Jakarta Utara" },
  // Banten
  { code: "ID-BT-TNG", provinceCode: "ID-BT", name: "Kota Tangerang" },
  { code: "ID-BT-TNGS", provinceCode: "ID-BT", name: "Tangerang Selatan" },
  // Jawa Barat
  { code: "ID-JB-BKS", provinceCode: "ID-JB", name: "Bekasi" },
  { code: "ID-JB-BGR", provinceCode: "ID-JB", name: "Bogor" },
  { code: "ID-JB-DPK", provinceCode: "ID-JB", name: "Depok" },
  { code: "ID-JB-BDG", provinceCode: "ID-JB", name: "Bandung" },
  // Jawa Tengah
  { code: "ID-JT-SMG", provinceCode: "ID-JT", name: "Semarang" },
  { code: "ID-JT-SKA", provinceCode: "ID-JT", name: "Surakarta" },
  // Jawa Timur
  { code: "ID-JI-SBY", provinceCode: "ID-JI", name: "Surabaya" },
  { code: "ID-JI-SDA", provinceCode: "ID-JI", name: "Sidoarjo" },
  // Kalimantan Timur
  { code: "ID-KI-BPN", provinceCode: "ID-KI", name: "Balikpapan" },
  { code: "ID-KI-SMD", provinceCode: "ID-KI", name: "Samarinda" },
  // Sulawesi Tengah
  { code: "ID-ST-MRW", provinceCode: "ID-ST", name: "Morowali" },
  { code: "ID-ST-PLU", provinceCode: "ID-ST", name: "Palu" },
  // Bali
  { code: "ID-BA-DPS", provinceCode: "ID-BA", name: "Denpasar" },
];

/** Strategic expansion provinces (Year 2–3 plan) — not live operations. */
export const STRATEGIC_PROVINCES_Y2: string[] = ["ID-JT", "ID-JI"];
export const STRATEGIC_PROVINCES_Y3: string[] = [
  "ID-SU",
  "ID-SS",
  "ID-KI",
  "ID-ST",
  "ID-BA",
];
export const STRATEGIC_PROVINCES_Y1_CORE: string[] = ["ID-JK", "ID-BT", "ID-JB"];

export function provinceByCode(code: string) {
  return ID_PROVINCES.find((p) => p.code === code);
}

export function cityByCode(code: string) {
  return ID_CITIES.find((c) => c.code === code);
}

export function citiesForProvince(provinceCode: string) {
  return ID_CITIES.filter((c) => c.provinceCode === provinceCode);
}
