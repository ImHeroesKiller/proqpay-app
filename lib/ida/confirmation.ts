import { createHmac, timingSafeEqual } from "crypto";
import type { IdaActionProposal } from "@/lib/ida/contracts";

const TTL_MS = 10 * 60 * 1000;

function secret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required for IDA confirmations");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createConfirmationToken(userId: string, proposal: IdaActionProposal) {
  const body = Buffer.from(
    JSON.stringify({ userId, proposal, expiresAt: Date.now() + TTL_MS }),
    "utf8",
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyConfirmationToken(token: string, userId: string): IdaActionProposal {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("Token konfirmasi tidak valid");
  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Token konfirmasi tidak valid");
  }
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    userId: string;
    proposal: IdaActionProposal;
    expiresAt: number;
  };
  if (parsed.userId !== userId) throw new Error("Konfirmasi bukan milik user ini");
  if (parsed.expiresAt < Date.now()) throw new Error("Konfirmasi sudah kedaluwarsa");
  return parsed.proposal;
}
