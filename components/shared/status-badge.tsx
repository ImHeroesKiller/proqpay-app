import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from "@/lib/design/status";
import type {
  ApprovalStatus,
  DisbursementStatus,
  EmploymentStatus,
  PayrollStatus,
  WorkingCapitalStatus,
} from "@/types";

type AnyStatus =
  | PayrollStatus
  | ApprovalStatus
  | DisbursementStatus
  | WorkingCapitalStatus
  | EmploymentStatus
  | string;

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  const config = getStatusConfig(String(status));
  return (
    <Badge
      variant={config.variant}
      className={className}
      title={config.description}
    >
      {config.label}
    </Badge>
  );
}
