"use client";

import Link from "next/link";
import { MapPin, Users } from "lucide-react";

export type MapEmployeeRow = {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  status: string;
  companyName: string;
  projectName: string;
  placementLocation: string;
  region: string;
};

export function MapEmployeeExplorer({
  rows,
  selectedRegion,
}: {
  rows: MapEmployeeRow[];
  selectedRegion: string;
}) {
  const visible = rows.filter((row) => row.region === selectedRegion);

  return (
    <section className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-navy">
              Karyawan di {selectedRegion}
            </h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Data karyawan mengikuti titik wilayah yang dipilih pada peta.
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          {visible.length} karyawan
        </span>
      </div>
      <div className="max-h-[300px] overflow-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Karyawan</th>
              <th className="px-5 py-3 font-semibold">Perusahaan / Proyek</th>
              <th className="px-5 py-3 font-semibold">Posisi</th>
              <th className="px-5 py-3 font-semibold">Lokasi</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length ? (
              visible.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <Link href={`/employees/${row.id}`} className="font-semibold text-navy hover:text-blue-600">
                      {row.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-slate-500">{row.employeeCode}</p>
                  </td>
                  <td className="px-5 py-3.5 text-navy">
                    <p className="font-medium">{row.companyName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{row.projectName || "Tanpa proyek aktif"}</p>
                  </td>
                  <td className="px-5 py-3.5 text-navy">
                    <p>{row.position || "-"}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{row.department || "-"}</p>
                  </td>
                  <td className="px-5 py-3.5 text-navy">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-violet-600" />
                      {row.placementLocation || row.region}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                  Belum ada data karyawan yang terpetakan pada wilayah ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
