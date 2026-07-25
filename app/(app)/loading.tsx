export default function AppLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat halaman">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-border/70 bg-white shadow-soft"
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-white shadow-soft" />
        <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-white shadow-soft" />
      </div>
    </div>
  );
}
