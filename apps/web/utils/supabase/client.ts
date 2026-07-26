import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, type TypedSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

export function createClient(): TypedSupabaseClient {
  const { url, publishableKey } = getSupabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
