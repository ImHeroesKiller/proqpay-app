"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, MapPin, MousePointer2 } from "lucide-react";
import { indonesiaProvinces } from "@/lib/data/indonesia-provinces";
import { MapEmployeeExplorer, type MapEmployeeRow } from "@/components/dashboard/map-employee-explorer";

type InteractiveIndonesiaMapProps = {
  headcount: number;
  employees: MapEmployeeRow[];
};
type LeafletMap = {
  remove: () => void;
  flyTo: (
    coordinates: [number, number],
    zoom: number,
    options: { duration: number },
  ) => void;
};
type LeafletApi = {
  map: (
    node: HTMLElement,
    options: Record<string, unknown>,
  ) => LeafletMap & {
    setView: (coordinates: [number, number], zoom: number) => LeafletMap;
  };
  control: {
    zoom: (options: { position: string }) => {
      addTo: (map: LeafletMap) => void;
    };
  };
  tileLayer: (
    url: string,
    options: Record<string, unknown>,
  ) => { addTo: (map: LeafletMap) => void };
  marker: (
    coordinates: [number, number],
    options: Record<string, unknown>,
  ) => {
    addTo: (map: LeafletMap) => {
      bindPopup: (
        content: string,
        options: Record<string, unknown>,
      ) => {
        on: (event: string, callback: () => void) => void;
      };
      on: (event: string, callback: () => void) => void;
    };
  };
  divIcon: (options: Record<string, unknown>) => unknown;
};

declare global {
  interface Window {
    proqLeaflet?: LeafletApi;
  }
}

function loadLeaflet(): Promise<LeafletApi> {
  if (window.proqLeaflet) return Promise.resolve(window.proqLeaflet);
  return new Promise((resolve, reject) => {
    let stylesheet = document.querySelector<HTMLLinkElement>(
      "link[data-proq-leaflet]",
    );
    if (!stylesheet) {
      stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      stylesheet.setAttribute("data-proq-leaflet", "");
      document.head.appendChild(stylesheet);
    }
    stylesheet.addEventListener(
      "error",
      () => reject(new Error("Leaflet stylesheet could not load")),
      { once: true },
    );
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      const api = (window as unknown as { L?: LeafletApi }).L;
      if (api) {
        window.proqLeaflet = api;
        resolve(api);
      } else reject(new Error("Leaflet did not initialise"));
    };
    script.onerror = () => reject(new Error("Leaflet script could not load"));
    document.head.appendChild(script);
  });
}

const regionPoints = [
  {
    id: "sumatera",
    label: "Sumatera",
    lat: 0.6,
    lng: 101.3,
    province: "Riau",
    color: "#ff7a00",
  },
  {
    id: "jawa",
    label: "Jawa",
    lat: -7.4,
    lng: 110.2,
    province: "Jawa Tengah",
    color: "#14b87a",
  },
  {
    id: "kalimantan",
    label: "Kalimantan",
    lat: -0.4,
    lng: 113.6,
    province: "Kalimantan Tengah",
    color: "#3178ef",
  },
  {
    id: "sulawesi",
    label: "Sulawesi",
    lat: -1.2,
    lng: 121.2,
    province: "Sulawesi Tengah",
    color: "#7c49f5",
  },
  {
    id: "bali",
    label: "Bali & Nusa Tenggara",
    lat: -8.5,
    lng: 116.8,
    province: "Bali",
    color: "#ff7a00",
  },
  {
    id: "papua",
    label: "Maluku & Papua",
    lat: -3.8,
    lng: 137.2,
    province: "Papua",
    color: "#3178ef",
  },
] as const;

export function InteractiveIndonesiaMap({
  headcount,
  employees,
}: InteractiveIndonesiaMapProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [province, setProvince] = useState("Jawa Tengah");
  const [region, setRegion] = useState("Jawa");
  const counts = useMemo(
    () =>
      regionPoints.map(
        (point) => employees.filter((employee) => employee.region === point.label).length,
      ),
    [employees],
  );

  useEffect(() => {
    let disposed = false;
    async function createMap() {
      const L = await loadLeaflet();
      if (disposed || !mapNode.current || mapRef.current) return;
      const map = L.map(mapNode.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      }).setView([-2.5, 118], 4.3);
      mapRef.current = map;
      L.control.zoom({ position: "topright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 11,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      regionPoints.forEach((point, index) => {
        const marker = L.marker([point.lat, point.lng], {
          icon: L.divIcon({
            className: "proq-map-marker",
            html: `<span style="--marker-color:${point.color}">${counts[index]}</span>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        }).addTo(map);
        marker.bindPopup(
          `<strong>${point.label}</strong><br/>${counts[index]} karyawan`,
          { closeButton: false, offset: [0, -14] },
        );
        marker.on("click", () => {
          setProvince(point.province);
          setRegion(point.label);
        });
      });
    }
    createMap();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [counts]);

  useEffect(() => {
    const point = regionPoints.find((item) => item.province === province);
    if (point) setRegion(point.label);
    mapRef.current?.flyTo(
      point ? [point.lat, point.lng] : [-2.5, 118],
      point ? 5.6 : 4.3,
      { duration: 0.75 },
    );
  }, [province]);

  return (
    <div className="space-y-4">
      <section
        className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.055)]"
        aria-labelledby="map-title"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-violet-600" />
              <h2
                id="map-title"
                className="text-[13px] font-bold uppercase tracking-[0.06em] text-navy"
              >
                Sebaran Karyawan Indonesia
              </h2>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Peta interaktif lokasi kerja · {headcount.toLocaleString("id-ID")} karyawan aktif
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-navy">
            <MapPin className="h-4 w-4 text-violet-600" />
            <select
              aria-label="Pilih provinsi pada peta"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              className="max-w-[230px] bg-transparent outline-none"
            >
              <option value="">Pilih provinsi</option>
              {indonesiaProvinces.map(([code, name]) => (
                <option key={code} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="relative h-[330px] bg-[#eef4f8]">
          <div ref={mapNode} className="h-full w-full" />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-sm backdrop-blur">
            <span className="mr-1.5 inline-flex">
              <MousePointer2 className="h-3.5 w-3.5 text-violet-600" />
            </span>
            Klik titik untuk melihat daftar karyawan wilayah
          </div>
        </div>
        <p className="border-t border-slate-100 px-5 py-2.5 text-[10px] text-muted-foreground">
          Data wilayah: <a className="pointer-events-auto underline hover:text-navy" href="https://github.com/indrayoga/data-wilayah-indonesia" target="_blank" rel="noreferrer">indrayoga/data-wilayah-indonesia</a> · Kepmendagri 2025 · Peta © OpenStreetMap contributors
        </p>
      </section>
      <MapEmployeeExplorer rows={employees} selectedRegion={region} />
    </div>
  );
}
