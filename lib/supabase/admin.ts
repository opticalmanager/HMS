import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase Admin client using the service role key.
 *
 * ⚠️ WARNING: Bypasses Row Level Security (RLS).
 * Only use in secure server actions or background services. Never expose to client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
