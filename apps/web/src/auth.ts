import { config } from "@autoapply/config";
import { signJwt } from "@autoapply/auth";
import { verifyUserCredentials } from "@autoapply/user";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: config.auth.secret,
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

        const user = await verifyUserCredentials(
          parsed.data.email,
          parsed.data.password,
        );

        if (!user) {
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
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      if (token.sub && token.email && typeof token.accessToken !== "string") {
        token.accessToken = await signJwt(
          {
            sub: token.sub,
            email: token.email,
            name: typeof token.name === "string" ? token.name : undefined,
          },
          config.auth.secret,
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
