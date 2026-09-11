import { createClient } from "@supabase/supabase-js";

export type BibleServerEnvStatus = {
  hasSupabaseUrl: boolean;
  hasServiceRoleKey: boolean;
  bibleTextEnabled: boolean;
};

function resolvedSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
}

function resolvedServiceKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    ""
  );
}

export function getBibleServerEnvStatus(): BibleServerEnvStatus {
  return {
    hasSupabaseUrl: Boolean(resolvedSupabaseUrl()),
    hasServiceRoleKey: Boolean(resolvedServiceKey()),
    bibleTextEnabled:
      process.env.BIBLE_TEXT_ENABLED?.trim().toLowerCase() === "true",
  };
}

export function createBibleAdminClient() {
  const url = resolvedSupabaseUrl();
  const key = resolvedServiceKey();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
