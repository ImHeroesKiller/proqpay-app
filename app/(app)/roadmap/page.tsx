import { PageHeader } from "@/components/shared/page-header";
import { ComingSoon } from "@/components/shared/coming-soon";
import { comingSoonModules } from "@/lib/data/constants";

export default function RoadmapPage() {
  return (
    <div>
      <PageHeader
        title="Product roadmap"
        description="Modules planned beyond the payroll operating system core."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comingSoonModules.map((module) => (
          <ComingSoon
            key={module.title}
            title={module.title}
            description={module.description}
          />
        ))}
      </div>
    </div>
  );
}
