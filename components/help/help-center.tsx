"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ClipboardCheck,
  Keyboard,
  Landmark,
  Mail,
  Sparkles,
  Wallet,
} from "lucide-react";

const FAQ = [
  {
    q: "What is ProQPay?",
    a: "ProQPay is MSG’s Enterprise Payroll Operating System. It orchestrates payroll preparation, validation, multilevel approval, payment instructions, client transfer confirmation, working capital, and audit — not a general HRIS or consumer fintech app.",
  },
  {
    q: "Who pays employees?",
    a: "The client transfers salaries from the client bank account to employees. Funding partners never pay employees directly. Working capital (if used) is released to the client bank first.",
  },
  {
    q: "What is a payment instruction?",
    a: "A structured instruction generated after approval so the client can execute payroll transfers. Banking integration may be simulated, file-based, or API-connected depending on configuration.",
  },
  {
    q: "What happens after proof upload?",
    a: "ProQPay verifies the transfer proof. Only after verification can payroll move to verified/closed. Rejected proofs require revision and re-upload.",
  },
  {
    q: "Who can see commercial and capital data?",
    a: "Clients, sales pipeline, pricing, and capital partner modules are restricted to authorized internal roles (typically Director / Super Admin, and Finance for capital modules).",
  },
];

const SHORTCUTS = [
  { keys: "⌘ / Ctrl + K", action: "Open command palette" },
  { keys: "Esc", action: "Close dialogs and overlays" },
  { keys: "Tab", action: "Move focus through interactive elements" },
  { keys: "Enter", action: "Activate focused button or command" },
];

export function HelpCenter({
  open,
  onOpenChange,
  onStartTour,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTour?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Help center</DialogTitle>
          <DialogDescription>
            Guidance for ProQPay operators — payroll workflow, confirmation, and
            governance. No placeholder content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Guides
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 px-3 py-3 text-left"
                onClick={() => {
                  onOpenChange(false);
                  onStartTour?.();
                }}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-orange" />
                <span>
                  <span className="block font-semibold">Start product tour</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    Role-based walkthrough of shell and workflow
                  </span>
                </span>
              </Button>
              <GuideCard
                icon={Wallet}
                title="Payroll workflow"
                body="Draft → validate → approve → payment instruction → client transfer → proof → verify → close."
              />
              <GuideCard
                icon={ClipboardCheck}
                title="Payment confirmation"
                body="Client uploads proof after transferring from client bank. Ops verify before close."
              />
              <GuideCard
                icon={Landmark}
                title="Working capital"
                body="Optional funding to client bank when self-funded transfer is not used. Settlement tracked separately."
              />
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Frequently asked questions
            </h3>
            <dl className="space-y-3">
              {FAQ.map((item) => (
                <div
                  key={item.q}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <dt className="font-semibold text-foreground">{item.q}</dt>
                  <dd className="mt-1 text-muted-foreground">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Keyboard className="h-3.5 w-3.5" />
              Keyboard shortcuts
            </h3>
            <ul className="space-y-1.5">
              {SHORTCUTS.map((s) => (
                <li
                  key={s.keys}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-muted-foreground">{s.action}</span>
                  <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px]">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-msg-blue/5 p-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4 text-msg-blue" />
              Contact support
            </h3>
            <p className="mt-1 text-muted-foreground">
              For production incidents, payroll exceptions, or access requests,
              contact MSG operations via your designated implementation channel.
              Include payroll period ID, client, and timestamp when possible.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GuideCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-msg-blue" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}
