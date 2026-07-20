import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  className,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
