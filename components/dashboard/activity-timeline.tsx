import {
  CheckCircle2,
  FileText,
  Upload,
  Wallet,
  ShieldCheck,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { AuditLog } from "@/types";
import { cn } from "@/lib/utils";

const moduleBadge: Record<string, string> = {
  Payroll: "bg-orange/15 text-orange",
  Absensi: "bg-sky-100 text-sky-700",
  Pembayaran: "bg-emerald-100 text-emerald-700",
  Approval: "bg-violet-100 text-violet-700",
  Keuangan: "bg-amber-100 text-amber-800",
  Sistem: "bg-muted text-muted-foreground",
};

function humanizeActivity(item: AuditLog): {
  sentence: string;
  module: string;
  icon: LucideIcon;
} {
  const action = (item.action ?? "").toUpperCase();
  const entity = (item.entity ?? "").toUpperCase();
  const detail = item.detail?.trim();
  const who = item.userName;
  const role = item.userRole.replaceAll("_", " ");

  // Prefer detail if already human-readable (no SCREAMING_SNAKE codes)
  if (
    detail &&
    !/^[A-Z0-9_]+$/.test(detail) &&
    detail.length > 12 &&
    !/[A-Z]{3,}_[A-Z]{3,}/.test(detail) &&
    !/CREATE |SET |EXEC_|BANK_FILE/i.test(detail)
  ) {
    return {
      sentence: detail,
      module: mapModule(entity),
      icon: iconFor(entity, action),
    };
  }

  if (
    /WORKING_CAPITAL|WORKING CAPITAL|funding branch/i.test(
      `${action} ${detail ?? ""} ${entity}`,
    )
  ) {
    return {
      sentence: `Jalur working capital diperbarui oleh ${who}`,
      module: "Keuangan",
      icon: Wallet,
    };
  }

  if (/DISBURSEMENT|CREATE DISBURSEMENT/i.test(`${action} ${detail ?? ""} ${entity}`)) {
    return {
      sentence: `Batch disbursement dibuat oleh ${who}`,
      module: "Pembayaran",
      icon: FileText,
    };
  }

  if (entity.includes("PAYROLL") || action.includes("PAYROLL")) {
    if (action.includes("APPROV")) {
      return {
        sentence: `Payroll disetujui oleh ${who} (${role})`,
        module: "Approval",
        icon: CheckCircle2,
      };
    }
    if (action.includes("SUBMIT") || action.includes("CREATE")) {
      return {
        sentence: `Periode payroll diproses oleh ${who}`,
        module: "Payroll",
        icon: Wallet,
      };
    }
    return {
      sentence: `Aktivitas payroll oleh ${who}`,
      module: "Payroll",
      icon: Wallet,
    };
  }

  if (entity.includes("APPROVAL") || action.includes("APPROV")) {
    return {
      sentence: `Langkah approval ditinjau oleh ${who}`,
      module: "Approval",
      icon: CheckCircle2,
    };
  }

  if (
    entity.includes("PAYMENT_INSTRUCTION") ||
    entity.includes("PAYMENTINSTRUCTION") ||
    action.includes("INSTRUCTION")
  ) {
    return {
      sentence: `Payment instruction dibuat oleh ${who}`,
      module: "Pembayaran",
      icon: FileText,
    };
  }

  if (
    entity.includes("CONFIRMATION") ||
    action.includes("VERIFY") ||
    action.includes("CONFIRM")
  ) {
    return {
      sentence: `Payment confirmation diverifikasi oleh ${who}`,
      module: "Pembayaran",
      icon: ShieldCheck,
    };
  }

  if (entity.includes("ATTEND") || action.includes("ATTEND")) {
    return {
      sentence: `Data absensi diunggah oleh ${who}`,
      module: "Absensi",
      icon: Upload,
    };
  }

  if (entity.includes("WORKING") || entity.includes("CAPITAL")) {
    return {
      sentence: `Permintaan working capital diperbarui oleh ${who}`,
      module: "Keuangan",
      icon: Wallet,
    };
  }

  if (entity.includes("EMPLOYEE") || action.includes("BANK")) {
    return {
      sentence: `Data karyawan diperbarui oleh ${who}`,
      module: "Sistem",
      icon: Activity,
    };
  }

  // Strip raw codes / internal names
  const cleaned = (detail || item.action || "Aktivitas sistem")
    .replace(/[_]+/g, " ")
    .replace(/\b(EXEC|SESSION|CREATED|VALIDATED|BANK FILE|WORKING CAPITAL|CREATE DISBURSEMENT BATCH)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 4 || /^[A-Z0-9\s]+$/.test(cleaned)) {
    return {
      sentence: `Aktivitas operasional oleh ${who}`,
      module: mapModule(entity),
      icon: iconFor(entity, action),
    };
  }

  return {
    sentence: `${cleaned} · ${who}`,
    module: mapModule(entity),
    icon: iconFor(entity, action),
  };
}

function mapModule(entity: string): string {
  const e = entity.toUpperCase();
  if (e.includes("PAYROLL")) return "Payroll";
  if (e.includes("APPROVAL")) return "Approval";
  if (e.includes("PAYMENT") || e.includes("DISBURSE")) return "Pembayaran";
  if (e.includes("ATTEND")) return "Absensi";
  if (e.includes("CAPITAL") || e.includes("WORKING")) return "Keuangan";
  return "Sistem";
}

function iconFor(entity: string, action: string): LucideIcon {
  const t = `${entity} ${action}`.toUpperCase();
  if (t.includes("APPROV")) return CheckCircle2;
  if (t.includes("CONFIRM") || t.includes("VERIFY")) return ShieldCheck;
  if (t.includes("INSTRUCTION") || t.includes("FILE")) return FileText;
  if (t.includes("ATTEND") || t.includes("UPLOAD")) return Upload;
  if (t.includes("PAYROLL") || t.includes("CAPITAL")) return Wallet;
  return Activity;
}

export function ActivityTimeline({ items }: { items: AuditLog[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada aktivitas terbaru.
      </p>
    );
  }

  return (
    <ol className="space-y-0 divide-y divide-border/70">
      {items.map((item) => {
        const human = humanizeActivity(item);
        const Icon = human.icon;
        const badge =
          moduleBadge[human.module] ?? "bg-muted text-muted-foreground";
        const time = new Date(item.timestamp).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <li
            key={item.id}
            className="flex gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/5 text-navy">
              <Icon className="h-4 w-4" strokeWidth={1.85} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium leading-snug text-navy">
                  {human.sentence}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    badge,
                  )}
                >
                  {human.module}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{time}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
