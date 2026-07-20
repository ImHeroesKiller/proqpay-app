"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buildBreadcrumbs } from "@/config/routes";
import { cn } from "@/lib/utils";

export function Breadcrumb({
  pathname,
  className,
}: {
  pathname: string;
  className?: string;
}) {
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.href}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
              ) : null}
              {isLast ? (
                <span
                  className="truncate font-medium text-foreground"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate transition hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
