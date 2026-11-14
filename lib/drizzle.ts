import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * Drizzle ORM Database Connection Pooler Instance
 *
 * Connects to Supabase PostgreSQL transaction pooler (port 6543)
 * with `prepare: false` to ensure leak-free serverless operation.
 */

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/hms";

// Global singleton to prevent connection pool leaks across Next.js Fast Refresh
declare global {
  // eslint-disable-next-line no-var
  var __hmsPostgresClient: postgres.Sql | undefined;
}

const maxConnections = process.env.DB_MAX_CONNECTIONS
  ? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
  : process.env.NODE_ENV === "production"
    ? 4
    : 8;

const client =
  globalThis.__hmsPostgresClient ||
  postgres(connectionString, {
    prepare: false, // Required for Supabase pgbouncer / Supavisor in transaction mode
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__hmsPostgresClient = client;
}

export const db = drizzle(client, { schema });
