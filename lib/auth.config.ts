import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/types";

/**
 * Edge-safe Auth.js config (no Prisma, no bcrypt).
 * Used by middleware for JWT session checks only.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = user.role;
        token.avatarInitials = user.avatarInitials;
        token.organizationId = user.organizationId;
        token.companyId = user.companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role as Role) ?? "VIEWER";
        session.user.avatarInitials = String(token.avatarInitials ?? "U");
        session.user.organizationId =
          typeof token.organizationId === "string"
            ? token.organizationId
            : undefined;
        session.user.companyId =
          typeof token.companyId === "string" || token.companyId === null
            ? (token.companyId as string | null)
            : undefined;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isLoginPage = path.startsWith("/login");
      const isPublic =
        isLoginPage || path.startsWith("/api/auth") || path === "/";

      if (!isLoggedIn && !isPublic) return false;
      if (isLoggedIn && (isLoginPage || path === "/")) {
        return Response.redirect(new URL("/dashboard", request.nextUrl.origin));
      }
      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
