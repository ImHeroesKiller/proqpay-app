import { MapPin } from "lucide-react";

type EmployeeDistributionCardProps = {
  headcount: number;
};

const regions = [
  { name: "Sumatera", x: "20%", y: "48%", count: 168, tone: "bg-orange-500" },
  { name: "Jawa", x: "38%", y: "72%", count: 652, tone: "bg-emerald-500" },
  { name: "Kalimantan", x: "52%", y: "42%", count: 120, tone: "bg-blue-500" },
  { name: "Sulawesi", x: "70%", y: "44%", count: 143, tone: "bg-violet-500" },
  {
    name: "Bali & Nusa Tenggara",
    x: "61%",
    y: "77%",
    count: 74,
    tone: "bg-orange-500",
  },
  {
    name: "Maluku & Papua",
    x: "86%",
    y: "66%",
    count: 55,
    tone: "bg-blue-500",
  },
];

export function EmployeeDistributionCard({
  headcount,
}: EmployeeDistributionCardProps) {
  return (
    <section
      className="h-full overflow-hidden rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.055)]"
      aria-labelledby="employee-distribution-title"
    >
      <h2
        id="employee-distribution-title"
        className="text-[12px] font-bold uppercase tracking-[0.06em] text-navy"
      >
        Sebaran Karyawan di Indonesia
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Peta distribusi karyawan per lokasi kerja
      </p>
      <p className="mt-2 text-xs font-semibold text-navy">
        Total {headcount.toLocaleString("id-ID")} karyawan
      </p>
      <div
        className="relative mt-2 h-[168px] overflow-hidden rounded-xl bg-gradient-to-br from-[#f5f7ff] via-white to-[#f5f2ff]"
        aria-label="Peta sebaran karyawan Indonesia"
      >
        <svg
          viewBox="0 0 760 260"
          className="absolute inset-0 h-full w-full opacity-80"
          aria-hidden="true"
        >
          <path
            d="M60 113c31-27 75-31 125-21l40 24-17 31-53 15-51-9-34-23zM251 134l87-14 65 9 17 23-58 17-75-6-36-29zM439 105l68 17 25 36-46 20-35-28-31-10 19-35zM552 148l74-18 55 18-27 27-72 5-30-12zM666 98l51-24 31 32-24 52-48-14-10-46z"
            fill="#cfd4ff"
          />
          <path
            d="M115 172l125 8 130 12 86-6 112 8 102-8"
            fill="none"
            stroke="#d9ddff"
            strokeLinecap="round"
            strokeWidth="10"
          />
        </svg>
        {regions.map((region) => (
          <div
            key={region.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: region.x, top: region.y }}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-full border-4 border-white text-[10px] font-extrabold text-white shadow-lg ${region.tone}`}
            >
              {region.count}
            </span>
            <span className="mt-1 block whitespace-nowrap text-center text-[9px] font-semibold text-navy/70">
              {region.name}
            </span>
          </div>
        ))}
        <MapPin className="absolute right-3 top-3 h-4 w-4 text-violet-500" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />
          &gt; 200
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />
          101–200
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />
          51–100
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
          ≤ 50
        </span>
      </div>
    </section>
  );
}
