import { auth } from "@/lib/auth";
import type { SessionScope } from "@/lib/auth/scope";
import type { Role } from "@/types";
import { redirect } from "next/navigation";
import {
  canAccessModule,
  type AppModule,
} from "@/lib/auth/permissions";

export async function requireSession(): Promise<SessionScope> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return {
    userId: session.user.id,
    role: (session.user.role as Role) ?? "VIEWER",
    organizationId: session.user.organizationId,
    companyId: session.user.companyId,
  };
}

export async function requireModule(module: AppModule): Promise<SessionScope> {
  const scope = await requireSession();
  if (!canAccessModule(scope.role, module)) {
    redirect("/dashboard");
  }
  return scope;
}
