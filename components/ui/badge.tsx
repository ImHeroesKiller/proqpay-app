import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy text-white dark:bg-white dark:text-navy",
        secondary: "border-transparent bg-muted text-foreground",
        outline: "text-foreground",
        accent: "border-transparent bg-orange/10 text-orange",
        success: "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        warning: "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        danger: "border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
        info: "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
