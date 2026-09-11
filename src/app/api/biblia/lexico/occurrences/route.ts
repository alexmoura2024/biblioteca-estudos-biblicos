import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const strong = request.nextUrl.searchParams
    .get("strong")
    ?.trim()
    .toUpperCase();

  if (!strong || !/^[HG]\d+$/.test(strong)) {
    return NextResponse.json(
      { error: "Strong inválido." },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Banco administrativo não configurado." },
      { status: 503 },
    );
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [{ count, error: countError }, { data, error }] =
    await Promise.all([
      supabase
        .from("bible_original_words")
        .select("id", { count: "exact", head: true })
        .eq("strong", strong),
      supabase
        .from("bible_original_words")
        .select("chapter,verse,books!inner(nome,slug,ordem_canonica)")
        .eq("strong", strong)
        .order("book_id", { ascending: true })
        .order("chapter", { ascending: true })
        .order("verse", { ascending: true })
        .limit(80),
    ]);

  if (countError || error) {
    return NextResponse.json(
      {
        error:
          countError?.message ||
          error?.message ||
          "Erro ao consultar ocorrências.",
      },
      { status: 500 },
    );
  }

  const seen = new Set<string>();
  const samples: Array<{
    bookName: string;
    bookSlug: string;
    chapter: number;
    verse: number;
  }> = [];

  for (const row of data ?? []) {
    const nested = row.books as
      | Record<string, unknown>
      | Array<Record<string, unknown>>
      | null;
    const book = Array.isArray(nested) ? nested[0] : nested;

    if (!book) continue;

    const chapter = Number(row.chapter);
    const verse = Number(row.verse);
    const bookSlug = String(book.slug);
    const keyRef = `${bookSlug}:${chapter}:${verse}`;

    if (seen.has(keyRef)) continue;
    seen.add(keyRef);

    samples.push({
      bookName: String(book.nome),
      bookSlug,
      chapter,
      verse,
    });

    if (samples.length >= 12) break;
  }

  return NextResponse.json({
    strong,
    count: count ?? 0,
    samples,
  });
}
