import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KpiCard as KpiCardType } from "@/types";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function KpiCard({ item }: { item: KpiCardType }) {
  const content = (
    <Card className="transition hover:border-orange/30">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {item.label}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight">{item.value}</p>
        {item.change ? (
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              item.trend === "up" && "text-emerald-600",
              item.trend === "down" && "text-amber-600",
              item.trend === "neutral" && "text-muted-foreground",
            )}
          >
            {item.trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : item.trend === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {item.change}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block focus-visible:rounded-xl">
        {content}
      </Link>
    );
  }
  return content;
}
