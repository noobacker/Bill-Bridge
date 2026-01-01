import type { NextAuthOptions } from "next-auth/next";
import type { JWT } from "@auth/core/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            username: credentials.username,
          },
        });

        if (!user) {
          return null;
        }

        const passwordValid = await compare(
          credentials.password,
          user.password
        );

        if (!passwordValid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          // allowedSections may be empty (meaning all) or a subset for supervisors
          allowedSections: (user as any).allowedSections ?? [],
        } as any;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: any, token: JWT }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.username = token.username;
        session.user.role = token.role;
        (session.user as any).allowedSections = (token as any).allowedSections ?? [];
      }
      return session;
    },
    async jwt({ token, user }: { token: any, user?: { id: string, name: string, username: string, role: string, allowedSections?: string[] } }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.username = user.username;
        token.role = user.role;
        (token as any).allowedSections = user.allowedSections ?? [];
      }
      return token;
    },
  },
};
