import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/bff/core/supabase/database.types";

let browserClient: SupabaseClient<Database> | null = null;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getPublicSupabaseConfig() {
  if (!supabaseUrl) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const config = getPublicSupabaseConfig();

  browserClient = createClient<Database>(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    },
  );

  return browserClient;
}

export async function getAccessToken() {
  const { data } = await getSupabaseBrowserClient().auth.getSession();

  return data.session?.access_token ?? null;
}