import { signJwt, verifyPassword } from "@autoapply/auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { prisma } = await import("@autoapply/database");

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) {
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const secret = process.env.AUTH_SECRET;

        if (!secret) {
          throw new Error("AUTH_SECRET is not configured");
        }

        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.accessToken = await signJwt(
          {
            sub: user.id ?? "",
            email: user.email ?? "",
            name: user.name,
          },
          secret,
        );
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token.sub && token.email) {
        session.user = {
          ...session.user,
          id: token.sub,
          email: token.email,
          name: typeof token.name === "string" ? token.name : null,
        };
        session.accessToken =
          typeof token.accessToken === "string" ? token.accessToken : undefined;
      }

      return session;
    },
  },
});
