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
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    organization({
      ac,
      roles: clinicRoles,
      schema: {
        organization: {
          modelName: "organizations",
        },
      },
    }),
    apiKey({
      references: "organization",
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
