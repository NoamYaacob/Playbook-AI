// ---------------------------------------------------------------------------
// NextAuth v5 (Auth.js beta) Configuration
//
// Server-only file – never import this in client components.
// ---------------------------------------------------------------------------

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Credential validation schema
// ---------------------------------------------------------------------------

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// ---------------------------------------------------------------------------
// NextAuth configuration
// ---------------------------------------------------------------------------

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // Validate shape
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Look up user
        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            avatarUrl: true,
            onboardingDone: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        // Verify password
        const passwordMatch = await compare(password, user.passwordHash);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.avatarUrl ?? undefined,
          onboardingDone: user.onboardingDone,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in `user` is populated; persist id to token
      if (user) {
        token.id = user.id;
        // user object here may include custom fields from authorize()
        const u = user as typeof user & { onboardingDone?: boolean };
        token.onboardingDone = u.onboardingDone ?? false;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as typeof session.user & { onboardingDone: boolean }).onboardingDone =
          (token.onboardingDone as boolean) ?? false;
      }
      return session;
    },
  },
});
