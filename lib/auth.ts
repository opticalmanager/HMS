import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { organization } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";
import { nextCookies } from "better-auth/next-js";
import { db } from "./drizzle";
import * as schema from "@/db/schema";
import { ac, clinicRoles } from "./auth-permissions";
import { env } from "./env";

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  trustedOrigins: async (request?: Request) => {
    const origins: (string | undefined | null)[] = [
      env.NEXT_PUBLIC_APP_URL,
      "http://localhost:*",
      "http://127.0.0.1:*",
      "http://0.0.0.0:*",
      "http://192.168.*:*",
      "http://10.*:*",
    ];
    if (process.env.VERCEL_URL) {
      origins.push(`https://${process.env.VERCEL_URL}`);
      origins.push("https://*.vercel.app");
    }
    const origin = request?.headers?.get("origin") || request?.headers?.get("referer");
    if (origin) {
      try {
        const u = new URL(origin);
        origins.push(`${u.protocol}//${u.host}`);
      } catch {}
    }
    return origins;
  },
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    organization({
      ac,
      roles: clinicRoles,
      requireEmailVerificationOnInvitation: false,
      sendInvitationEmail: async (data) => {
        const inviteLink = `${env.NEXT_PUBLIC_APP_URL}/accept-invitation/${data.id}`;
        const maskedEmail =
          env.NODE_ENV === "production"
            ? data.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
            : data.email;
        console.log(`[BETTER-AUTH INVITATION] Dispatched invite to ${maskedEmail}. Acceptance URL: ${inviteLink}`);
      },
      schema: {
        organization: {
          modelName: "organizations",
        },
      },
    }),
    apiKey({
      references: "organization",
      enableMetadata: true,
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
