import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { users, DEMO_PASSWORD } from "@/lib/data/seed";
import type { Role } from "@/types";

declare module "next-auth" {
  interface User {
    role: Role;
    avatarInitials: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
      avatarInitials: string;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase();
        const password = String(credentials?.password ?? "");
        const user = users.find((u) => u.email.toLowerCase() === email);
        if (!user || password !== DEMO_PASSWORD) {
          return null;
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarInitials: user.avatarInitials,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = user.role;
        token.avatarInitials = user.avatarInitials;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role as Role) ?? "VIEWER";
        session.user.avatarInitials = String(token.avatarInitials ?? "U");
      }
      return session;
    },
  },
  trustHost: true,
});
