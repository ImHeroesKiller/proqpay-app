import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    name: session.user.name ?? "User",
    email: session.user.email ?? null,
    role: session.user.role,
    avatarInitials: session.user.avatarInitials ?? "U",
    organizationId: session.user.organizationId,
    companyId: session.user.companyId ?? null,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
