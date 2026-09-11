import { NextResponse } from "next/server";
import {
  createBibleAdminClient,
  getBibleServerEnvStatus,
} from "@/lib/bible/serverAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const env = getBibleServerEnvStatus();
  const supabase = createBibleAdminClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        env,
        database: {
          reachable: false,
        },
      },
      { status: 503 },
    );
  }

  const [
    versionResult,
    verseCountResult,
    hebrewCountResult,
    greekCountResult,
  ] = await Promise.all([
    supabase
      .from("bible_versions")
      .select("code,name")
      .eq("code", "acf-private")
      .maybeSingle(),
    supabase
      .from("bible_verses")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("bible_original_words")
      .select("id", { count: "exact", head: true })
      .eq("language", "he"),
    supabase
      .from("bible_original_words")
      .select("id", { count: "exact", head: true })
      .eq("language", "grc"),
  ]);

  const firstError =
    versionResult.error ||
    verseCountResult.error ||
    hebrewCountResult.error ||
    greekCountResult.error;

  if (firstError) {
    return NextResponse.json(
      {
        ok: false,
        env,
        database: {
          reachable: true,
          error: firstError.message,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    env,
    database: {
      reachable: true,
      acfVersionFound: Boolean(versionResult.data),
      verses: verseCountResult.count ?? 0,
      hebrewWords: hebrewCountResult.count ?? 0,
      greekWords: greekCountResult.count ?? 0,
    },
  });
}
