import { AppShell } from "@/components/layout/app-shell";

/**
 * Co-locate Node/serverless compute with Supabase ap-southeast-2 (Sydney).
 * Must be a string literal (Next.js segment config is statically analyzed).
 * Project default also set in vercel.json → regions: ["syd1"].
 * Keep in sync with lib/runtime-region.ts PREFERRED_COMPUTE_REGION.
 */
export const preferredRegion = "syd1";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
