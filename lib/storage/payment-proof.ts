import {
  getSupabaseAdmin,
  PAYMENT_PROOF_BUCKET,
} from "@/lib/supabase/server";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export type UploadProofInput = {
  companyId: string;
  payrollPeriodId: string;
  confirmationId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
};

export function validateProofFile(mimeType: string, size: number): string | null {
  if (!ALLOWED_MIME.has(mimeType) && mimeType !== "image/jpg") {
    return "Only PDF, PNG, and JPG files are allowed.";
  }
  if (size <= 0 || size > MAX_BYTES) {
    return "File must be between 1 byte and 10 MB.";
  }
  return null;
}

/** Placeholder for future AV scanning integration. */
export function virusScanPlaceholder(bytes: Buffer): {
  clean: boolean;
  note: string;
} {
  void bytes;
  return { clean: true, note: "AV scan placeholder — not production-grade" };
}

export function buildStoragePath(
  companyId: string,
  payrollPeriodId: string,
  confirmationId: string,
  fileName: string,
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${companyId}/${payrollPeriodId}/${confirmationId}/${Date.now()}_${safe}`;
}

export async function ensurePaymentProofBucket(): Promise<void> {
  const sb = getSupabaseAdmin();
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === PAYMENT_PROOF_BUCKET);
  if (!exists) {
    await sb.storage.createBucket(PAYMENT_PROOF_BUCKET, {
      public: false,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"],
    });
  }
}

export async function uploadPaymentProof(
  input: UploadProofInput,
): Promise<{ storagePath: string }> {
  const err = validateProofFile(input.mimeType, input.bytes.length);
  if (err) throw new Error(err);

  const scan = virusScanPlaceholder(input.bytes);
  if (!scan.clean) throw new Error("File failed security scan.");

  await ensurePaymentProofBucket();

  const path = buildStoragePath(
    input.companyId,
    input.payrollPeriodId,
    input.confirmationId,
    input.fileName,
  );

  const sb = getSupabaseAdmin();
  const { error } = await sb.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return { storagePath: path };
}

/** Signed URL only — never return public permanent URLs. */
export async function createProofSignedUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage
    .from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not create signed URL");
  }
  return data.signedUrl;
}
