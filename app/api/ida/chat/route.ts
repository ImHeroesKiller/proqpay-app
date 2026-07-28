import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateWithPool } from "@/lib/ai/gemini-pool";
import { createConfirmationToken } from "@/lib/ida/confirmation";
import type {
  IdaActionProposal,
  IdaChatResponse,
  IdaConversationState,
} from "@/lib/ida/contracts";

export const runtime = "nodejs";

const SYSTEM = `Anda adalah IDA, AI Payroll Operator untuk ProQPay Lite.
Seluruh pekerjaan utama dilakukan melalui percakapan. Dashboard hanya mencerminkan hasil sistem.
Jawab Bahasa Indonesia, singkat, jelas, dan operasional.
Flow wajib: import → validasi client/project → payroll setup Indonesia → kalkulasi → approval
→ payment instruction → konfirmasi pembayaran → laporan.
Jangan menyatakan transaksi berhasil tanpa bukti eksekusi server.
Untuk aksi yang mengubah data, selalu buat preview dan minta konfirmasi.
Keluarkan JSON valid dengan bentuk:
{
  "reply":"jawaban",
  "workflowStage":"SETUP|IMPORT|VALIDATION|CALCULATION|APPROVAL|PAYMENT_INSTRUCTION|PAYMENT_CONFIRMATION|REPORTING",
  "currentPayrollPeriodId":"uuid opsional",
  "proposal":{
    "type":"NONE|REFRESH_DASHBOARD|RECALCULATE_PAYROLL|SUBMIT_PAYROLL_APPROVAL|LOCK_PAYROLL|GENERATE_PAYSLIPS|OPEN_ADMIN_MODULE",
    "label":"label tombol",
    "description":"dampak aksi",
    "requiresConfirmation":true,
    "payload":{"periodId":"uuid opsional"},
    "adminHref":"/route opsional"
  }
}`;

const adminRoutes = new Set([
  "/import",
  "/clients",
  "/projects",
  "/payroll-groups",
  "/scheme-builder",
  "/validation",
  "/payroll",
  "/approval",
  "/payment-instructions",
  "/payment-confirmation",
  "/billing",
  "/settings",
]);

const actionTypes = new Set([
  "NONE",
  "REFRESH_DASHBOARD",
  "RECALCULATE_PAYROLL",
  "SUBMIT_PAYROLL_APPROVAL",
  "LOCK_PAYROLL",
  "GENERATE_PAYSLIPS",
  "OPEN_ADMIN_MODULE",
]);

function sanitizeProposal(value: unknown): IdaActionProposal | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.type !== "string" || !actionTypes.has(raw.type) || raw.type === "NONE") return undefined;
  const adminHref = typeof raw.adminHref === "string" && adminRoutes.has(raw.adminHref)
    ? raw.adminHref
    : undefined;
  const payload = raw.payload && typeof raw.payload === "object"
    ? Object.fromEntries(
        Object.entries(raw.payload as Record<string, unknown>)
          .filter(([, item]) => ["string", "number", "boolean"].includes(typeof item) || item === null)
          .slice(0, 12),
      ) as Record<string, string | number | boolean | null>
    : undefined;
  return {
    type: raw.type as IdaActionProposal["type"],
    label: typeof raw.label === "string" ? raw.label.slice(0, 80) : "Konfirmasi Aksi",
    description: typeof raw.description === "string" ? raw.description.slice(0, 500) : "IDA akan menjalankan aksi ini melalui server.",
    requiresConfirmation: raw.requiresConfirmation !== false,
    payload,
    adminHref,
  };
}

function parseReply(text: string) {
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    if (typeof value.reply !== "string" || !value.reply.trim()) return null;
    return {
      reply: value.reply.trim().slice(0, 1800),
      workflowStage: typeof value.workflowStage === "string" ? value.workflowStage : undefined,
      currentPayrollPeriodId:
        typeof value.currentPayrollPeriodId === "string" ? value.currentPayrollPeriodId : undefined,
      proposal: sanitizeProposal(value.proposal),
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    message?: string;
    pathname?: string;
    state?: Partial<IdaConversationState>;
  };
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });
  }

  const previousState = body.state;
  const result = await generateWithPool({
    system: SYSTEM,
    prompt: `Role user: ${session.user.role ?? "USER"}
Workspace aktif: ${body.pathname ?? "/dashboard"}
State saat ini: ${JSON.stringify(previousState ?? {})}
Permintaan user: ${message.slice(0, 2400)}`,
  });
  const parsed = result?.text ? parseReply(result.text) : null;

  const state: IdaConversationState = {
    conversationId: previousState?.conversationId || randomUUID(),
    currentClientId: previousState?.currentClientId,
    currentProjectId: previousState?.currentProjectId,
    currentPayrollPeriodId:
      parsed?.currentPayrollPeriodId || previousState?.currentPayrollPeriodId,
    workflowStage:
      (parsed?.workflowStage as IdaConversationState["workflowStage"]) ||
      previousState?.workflowStage ||
      "SETUP",
    pendingAction: parsed?.proposal,
    updatedAt: new Date().toISOString(),
  };

  const proposal = parsed?.proposal;
  const confirmationToken = proposal?.requiresConfirmation
    ? createConfirmationToken(session.user.id, proposal)
    : undefined;

  const response: IdaChatResponse = {
    reply:
      parsed?.reply ||
      "IDA sedang tidak dapat mengakses model AI. Tidak ada data yang diubah. Silakan coba lagi atau gunakan modul admin fallback.",
    state,
    proposal,
    confirmationToken,
    model: result?.model,
    worker: result?.workerId,
    offline: !parsed,
  };

  return NextResponse.json(response);
}
