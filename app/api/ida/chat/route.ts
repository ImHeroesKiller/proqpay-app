import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateWithPool } from "@/lib/ai/gemini-pool";

export const runtime = "nodejs";

const SYSTEM = `Anda adalah IDA, Intelligent Digital Assistant untuk ProQPay.
Jawab dalam Bahasa Indonesia yang singkat, jelas, dan operasional.
Konteks proses wajib: import data → validasi client/project → payroll setup Indonesia
→ konfirmasi user → payment instruction → monitoring pembayaran → invoice dan AR.
Jangan pernah menyatakan transaksi, approval, commit database, atau pembayaran sudah
berhasil jika tidak ada bukti dari sistem. Jangan meminta credential bank.
Jika format upload bank belum tersimpan, jelaskan bahwa template resmi diminta tepat
saat generate payment instruction. Keluarkan JSON valid:
{"reply":"jawaban","href":"/route-opsional","action":"label-opsional"}`;

const allowedRoutes = new Set([
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

function parseReply(text: string) {
  try {
    const value = JSON.parse(text) as {
      reply?: unknown;
      href?: unknown;
      action?: unknown;
    };
    if (typeof value.reply !== "string" || !value.reply.trim()) return null;
    const href =
      typeof value.href === "string" && allowedRoutes.has(value.href)
        ? value.href
        : undefined;
    return {
      reply: value.reply.trim().slice(0, 1600),
      href,
      action:
        href && typeof value.action === "string"
          ? value.action.trim().slice(0, 80)
          : undefined,
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
  };
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });
  }

  const result = await generateWithPool({
    system: SYSTEM,
    prompt: `Role user: ${session.user.role ?? "USER"}
Modul aktif: ${body.pathname ?? "/dashboard"}
Permintaan: ${message.slice(0, 2000)}`,
  });
  const parsed = result?.text ? parseReply(result.text) : null;

  if (!parsed) {
    return NextResponse.json({
      reply:
        "IDA sedang tidak dapat mengakses model AI. Anda tetap dapat menjalankan proses melalui modul terkait; tidak ada data yang diubah.",
      href: "/dashboard",
      action: "Kembali ke Dashboard",
      offline: true,
    });
  }

  return NextResponse.json({
    ...parsed,
    model: result?.model,
    worker: result?.workerId,
  });
}
