"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { generateWithPool } from "@/lib/ai/gemini-pool";
import {
  extractJsonObject,
  parseSchemeDsl,
  type SchemeDsl,
} from "@/lib/scheme/dsl";
import { runSimulations } from "@/lib/scheme/simulate";

const SYSTEM_GUIDE = `Anda adalah ProQ AI Payroll Scheme Builder untuk ProQPay (Indonesia).
Tugas: memandu user menyusun skema payroll secara bertahap, lalu menghasilkan DSL JSON terkontrol.

Aturan:
- Bahasa Indonesia, profesional, ringkas.
- Jangan output SQL, JavaScript, atau eval.
- Jangan mengaktifkan skema; hanya draft.
- Jika data kurang, tanyakan lanjutan (client, project, payroll group, jenis pekerja, komponen, BPJS, PPh21, prorate, rounding, billing fee, approval, effective date).
- Saat user meminta generate draft, sertakan SATU blok JSON valid sesuai schema:
{
  "schemeName": string,
  "currency": "IDR",
  "workerType": "MONTHLY"|"DAILY"|"WEEKLY"|"SHIFT"|"OUTPUT"|"COMMISSION",
  "components": [{ "code", "name", "kind":"EARNING"|"DEDUCTION"|"EMPLOYER_COST"|"INFO", "method":"FIXED"|"QUANTITY_RATE"|"PERCENT_OF_BASIC"|"PERCENT_OF_GROSS"|"FORMULA"|"ATTENDANCE_BASED", "amount"?, "rate"?, "percent"?, "quantitySource"?, "formula"?, "taxable", "bpjsApplicable", "proratable" }],
  "taxPolicy": { "method": "GROSS"|"NET"|"GROSS_UP" },
  "bpjsPolicy": { "enabled": boolean, "method": "STANDARD"|"NONE" },
  "rounding": "NEAREST"|"UP"|"DOWN",
  "assumptions": string[]
}`;

export async function listSchemeConversations() {
  await requireSession();
  return prisma.payrollSchemeConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { drafts: { orderBy: { version: "desc" }, take: 1 } },
  });
}

export async function createSchemeConversation(input?: {
  title?: string;
  companyId?: string;
  projectId?: string;
  payrollGroupId?: string;
}) {
  const scope = await requireSession();
  const id = randomUUID();
  await prisma.payrollSchemeConversation.create({
    data: {
      id,
      title: input?.title ?? "Skema Payroll Baru",
      companyId: input?.companyId ?? scope.companyId ?? null,
      projectId: input?.projectId,
      payrollGroupId: input?.payrollGroupId,
      status: "DRAFT",
      createdBy: scope.userId,
      messages: {
        create: {
          id: randomUUID(),
          role: "assistant",
          content:
            "Selamat datang di ProQ AI Payroll Scheme Builder.\n\nSaya akan bantu menyusun skema payroll secara bertahap.\n\n1. Skema ini untuk client mana?\n2. Project mana?\n3. Payroll group mana?\n4. Jenis pekerja (bulanan/harian/mingguan/shift/output/komisi)?\n\nAnda juga bisa langsung mendeskripsikan skema, contoh: \"Buat skema SPG, gaji pokok 5 juta, uang makan 25rb/hadir, transport 20rb/hadir, BPJS normal, pajak gross-up.\"",
        },
      },
    },
  });
  return id;
}

export async function getSchemeConversation(id: string) {
  await requireSession();
  return prisma.payrollSchemeConversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      drafts: {
        orderBy: { version: "desc" },
        include: {
          simulations: true,
          approvals: true,
        },
      },
    },
  });
}

export async function sendSchemeMessage(conversationId: string, content: string) {
  const scope = await requireSession();
  const conv = await prisma.payrollSchemeConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } },
  });
  if (!conv) return { ok: false as const, error: "Percakapan tidak ditemukan" };

  await prisma.payrollSchemeMessage.create({
    data: {
      id: randomUUID(),
      conversationId,
      role: "user",
      content,
    },
  });

  let replyText =
    "Terima kasih. Mohon lengkapi client, project, payroll group, dan komponen utama agar draft dapat digenerate.";
  let structured: SchemeDsl | null = null;

  try {
    const prompt = `Riwayat ringkas:\n${conv.messages
      .slice(-8)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")}\n\nUser: ${content}\n\nJawab sebagai asisten. Jika cukup data untuk draft, sertakan JSON DSL.`;

    const result = await generateWithPool({
      prompt,
      system: SYSTEM_GUIDE,
    });
    replyText = result?.text?.trim() || replyText;
    const json = extractJsonObject(replyText);
    if (json) {
      const parsed = parseSchemeDsl(json);
      if (parsed.ok) structured = parsed.data;
    }
  } catch {
    replyText =
      "Maaf, asisten sedang sibuk. Silakan coba lagi atau gunakan Generate Draft setelah melengkapi asumsi.";
  }

  await prisma.payrollSchemeMessage.create({
    data: {
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content: replyText,
      structuredJson: structured ?? undefined,
    },
  });

  if (structured) {
    const draftId = randomUUID();
    const version =
      (await prisma.payrollSchemeDraft.count({ where: { conversationId } })) + 1;
    await prisma.payrollSchemeDraft.create({
      data: {
        id: draftId,
        conversationId,
        companyId: conv.companyId,
        projectId: conv.projectId,
        payrollGroupId: conv.payrollGroupId,
        schemeName: structured.schemeName,
        status: "AI_GENERATED",
        dslJson: structured,
        unresolvedAssumptions: structured.assumptions ?? [],
        version,
        createdBy: scope.userId,
      },
    });
    await prisma.payrollSchemeConversation.update({
      where: { id: conversationId },
      data: { status: "AI_GENERATED", title: structured.schemeName },
    });
  } else {
    await prisma.payrollSchemeConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  return { ok: true as const };
}

export async function generateDraftFromConversation(conversationId: string) {
  const scope = await requireSession();
  const conv = await prisma.payrollSchemeConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) return { ok: false as const, error: "Percakapan tidak ditemukan" };

  const transcript = conv.messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `Berdasarkan percakapan berikut, generate HANYA JSON DSL payroll scheme (boleh dibungkus markdown code fence):\n\n${transcript}`;

  let structured: SchemeDsl | null = null;
  try {
    const result = await generateWithPool({
      prompt,
      system: SYSTEM_GUIDE,
    });
    if (!result?.text) {
      return { ok: false as const, error: "Gagal memanggil AI. Coba lagi." };
    }
    const json = extractJsonObject(result.text);
    if (json) {
      const parsed = parseSchemeDsl(json);
      if (parsed.ok) structured = parsed.data;
      else return { ok: false as const, error: parsed.errors.join("; ") };
    }
  } catch {
    return { ok: false as const, error: "Gagal memanggil AI. Coba lagi." };
  }

  if (!structured) {
    return {
      ok: false as const,
      error: "AI belum menghasilkan skema terstruktur yang valid.",
    };
  }

  const draftId = randomUUID();
  const version =
    (await prisma.payrollSchemeDraft.count({ where: { conversationId } })) + 1;
  await prisma.payrollSchemeDraft.create({
    data: {
      id: draftId,
      conversationId,
      companyId: conv.companyId,
      projectId: conv.projectId,
      payrollGroupId: conv.payrollGroupId,
      schemeName: structured.schemeName,
      status: "AI_GENERATED",
      dslJson: structured,
      unresolvedAssumptions: structured.assumptions ?? [],
      version,
      createdBy: scope.userId,
    },
  });

  await prisma.payrollSchemeMessage.create({
    data: {
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content: `Draft skema **${structured.schemeName}** berhasil digenerate (v${version}). Lanjutkan dengan Run Simulation sebelum approval.`,
      structuredJson: structured,
    },
  });

  return { ok: true as const, draftId };
}

export async function simulateSchemeDraft(draftId: string) {
  await requireSession();
  const draft = await prisma.payrollSchemeDraft.findUnique({
    where: { id: draftId },
  });
  if (!draft) return { ok: false as const, error: "Draft tidak ditemukan" };

  const parsed = parseSchemeDsl(draft.dslJson);
  if (!parsed.ok) return { ok: false as const, error: parsed.errors.join("; ") };

  await prisma.payrollSchemeSimulation.deleteMany({ where: { draftId } });
  const results = runSimulations(parsed.data);
  for (const r of results) {
    await prisma.payrollSchemeSimulation.create({
      data: {
        id: randomUUID(),
        draftId,
        testCaseCode: r.code,
        testCaseName: r.name,
        inputJson: r.input,
        resultJson: r.result,
        passed: r.passed,
      },
    });
  }

  const allPass = results.every((r) => r.passed);
  await prisma.payrollSchemeDraft.update({
    where: { id: draftId },
    data: { status: "SIMULATED" },
  });

  return { ok: true as const, allPass, results };
}

export async function submitSchemeForApproval(draftId: string) {
  const scope = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: scope.userId } });
  const draft = await prisma.payrollSchemeDraft.findUnique({
    where: { id: draftId },
    include: { simulations: true },
  });
  if (!draft) return { ok: false as const, error: "Draft tidak ditemukan" };
  if (draft.status !== "SIMULATED" && draft.status !== "UNDER_REVIEW") {
    return {
      ok: false as const,
      error: "Jalankan simulasi terlebih dahulu sebelum approval",
    };
  }
  const failed = draft.simulations.filter((s) => s.passed === false);
  if (failed.length) {
    return {
      ok: false as const,
      error: "Masih ada test case gagal. Perbaiki skema dulu.",
    };
  }

  await prisma.payrollSchemeApproval.deleteMany({ where: { draftId } });
  await prisma.payrollSchemeApproval.createMany({
    data: [
      {
        id: randomUUID(),
        draftId,
        level: 1,
        approverRole: "PAYROLL_ADMIN",
        status: "PENDING",
      },
      {
        id: randomUUID(),
        draftId,
        level: 2,
        approverRole: "DIRECTOR",
        status: "PENDING",
      },
    ],
  });
  await prisma.payrollSchemeDraft.update({
    where: { id: draftId },
    data: { status: "UNDER_REVIEW" },
  });

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId: draft.companyId,
      userId: scope.userId,
      userName: user?.name ?? "User",
      userRole: scope.role,
      action: "SCHEME_SUBMIT_APPROVAL",
      entity: "PayrollSchemeDraft",
      entityId: draftId,
      ip: "app",
    },
  });

  return { ok: true as const };
}

export async function approveSchemeDraft(
  draftId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
) {
  const scope = await requireSession();
  const role = scope.role;
  if (
    !["SUPER_ADMIN", "DIRECTOR", "PAYROLL_ADMIN", "APPROVER"].includes(role)
  ) {
    return { ok: false as const, error: "Anda tidak berwenang menyetujui skema" };
  }

  const pending = await prisma.payrollSchemeApproval.findFirst({
    where: { draftId, status: "PENDING" },
    orderBy: { level: "asc" },
  });
  if (!pending) return { ok: false as const, error: "Tidak ada approval pending" };

  await prisma.payrollSchemeApproval.update({
    where: { id: pending.id },
    data: {
      status: decision,
      comment,
      actedBy: scope.userId,
      actedAt: new Date(),
    },
  });

  if (decision === "REJECTED") {
    await prisma.payrollSchemeDraft.update({
      where: { id: draftId },
      data: { status: "DRAFT" },
    });
    return { ok: true as const, status: "DRAFT" };
  }

  const stillPending = await prisma.payrollSchemeApproval.count({
    where: { draftId, status: "PENDING" },
  });
  if (stillPending === 0) {
    await prisma.payrollSchemeDraft.update({
      where: { id: draftId },
      data: {
        status: "APPROVED",
        approvedBy: scope.userId,
        approvedAt: new Date(),
      },
    });
    return { ok: true as const, status: "APPROVED" };
  }
  return { ok: true as const, status: "UNDER_REVIEW" };
}

export async function activateSchemeDraft(
  draftId: string,
  effectiveDate: string,
) {
  const scope = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: scope.userId } });
  if (!["SUPER_ADMIN", "DIRECTOR", "PAYROLL_ADMIN"].includes(scope.role)) {
    return { ok: false as const, error: "Tidak berwenang mengaktifkan skema" };
  }

  const draft = await prisma.payrollSchemeDraft.findUnique({
    where: { id: draftId },
    include: { simulations: true, approvals: true },
  });
  if (!draft) return { ok: false as const, error: "Draft tidak ditemukan" };
  if (draft.status !== "APPROVED") {
    return {
      ok: false as const,
      error: "Skema harus APPROVED sebelum diaktifkan. AI tidak dapat activate langsung.",
    };
  }
  if (!draft.simulations.length || draft.simulations.some((s) => !s.passed)) {
    return { ok: false as const, error: "Simulasi belum lengkap / masih gagal" };
  }
  if (draft.approvals.some((a) => a.status !== "APPROVED")) {
    return { ok: false as const, error: "Approval belum selesai" };
  }
  if (!effectiveDate) {
    return { ok: false as const, error: "Effective date wajib diisi" };
  }

  const parsed = parseSchemeDsl(draft.dslJson);
  if (!parsed.ok) return { ok: false as const, error: "DSL tidak valid" };

  // Supersede other active drafts same conversation
  await prisma.payrollSchemeDraft.updateMany({
    where: {
      conversationId: draft.conversationId,
      status: "ACTIVE",
      id: { not: draftId },
    },
    data: { status: "SUPERSEDED" },
  });

  await prisma.payrollSchemeDraft.update({
    where: { id: draftId },
    data: {
      status: "ACTIVE",
      effectiveDate: new Date(effectiveDate),
      activatedAt: new Date(),
    },
  });
  await prisma.payrollSchemeConversation.update({
    where: { id: draft.conversationId },
    data: { status: "ACTIVE" },
  });

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId: draft.companyId,
      userId: scope.userId,
      userName: user?.name ?? "User",
      userRole: scope.role,
      action: "SCHEME_ACTIVATE",
      entity: "PayrollSchemeDraft",
      entityId: draftId,
      detail: `effective ${effectiveDate}`,
      ip: "app",
    },
  });

  return { ok: true as const };
}
