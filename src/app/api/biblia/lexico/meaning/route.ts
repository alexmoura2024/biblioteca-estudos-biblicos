import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cleanLexicalGloss } from "@/lib/bible/lexicalPresentation";

export const maxDuration = 45;

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const data = payload as Record<string, unknown>;

  if (typeof data.output_text === "string") {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) return "";

  const parts: string[] = [];

  for (const item of data.output) {
    if (!item || typeof item !== "object") continue;

    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (!block || typeof block !== "object") continue;

      const record = block as Record<string, unknown>;

      if (
        record.type === "output_text" &&
        typeof record.text === "string"
      ) {
        parts.push(record.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start < 0 || end < start) return {};

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      wordId?: string;
    };

    if (!body.wordId || !/^\d+$/.test(body.wordId)) {
      return NextResponse.json(
        { error: "Palavra original inválida." },
        { status: 400 },
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

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

    const { data: word, error: wordError } = await supabase
      .from("bible_original_words")
      .select("id,strong,gloss,contextual_translation")
      .eq("id", body.wordId)
      .single();

    if (wordError || !word) {
      return NextResponse.json(
        { error: "Palavra original não encontrada." },
        { status: 404 },
      );
    }

    const strong =
      typeof word.strong === "string"
        ? word.strong.trim().toUpperCase()
        : "";

    const sourceGloss = cleanLexicalGloss(
      typeof word.gloss === "string" ? word.gloss : null,
    );

    const sourceContextual = cleanLexicalGloss(
      typeof word.contextual_translation === "string"
        ? word.contextual_translation
        : null,
    );

    const [meaningCacheResult, contextualCacheResult] =
      await Promise.all([
        strong
          ? supabase
              .from("bible_strong_meanings_pt")
              .select("meaning_pt,source_gloss,model")
              .eq("strong", strong)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("bible_word_context_pt")
          .select("contextual_pt,source_contextual,model")
          .eq("word_id", word.id)
          .maybeSingle(),
      ]);

    const meaningCache = meaningCacheResult.data;
    const contextualCache = contextualCacheResult.data;

    let meaningPt =
      meaningCache?.meaning_pt &&
      meaningCache.source_gloss === sourceGloss
        ? String(meaningCache.meaning_pt)
        : null;

    let contextualPt =
      contextualCache?.contextual_pt &&
      contextualCache.source_contextual === sourceContextual
        ? String(contextualCache.contextual_pt)
        : null;

    const needMeaning =
      Boolean(strong && sourceGloss && !meaningPt);
    const needContextual =
      Boolean(sourceContextual && !contextualPt);

    if (!needMeaning && !needContextual) {
      return NextResponse.json({
        meaningPt,
        contextualPt,
        cached: true,
      });
    }

    if (!openAiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY não configurada para traduzir os dados lexicais.",
        },
        { status: 503 },
      );
    }

    const model =
      process.env.OPENAI_LIBRARY_MODEL || "gpt-5.6-luna";

    const instructions = [
      "Traduza dados lexicais bíblicos para português do Brasil.",
      "Não explique, não faça aplicação teológica e não acrescente sentidos ausentes.",
      "Preserve alternativas reais de significado.",
      "Quando houver barras / na tradução contextual, preserve a separação equivalente quando ela ajudar a mostrar os componentes da expressão.",
      "Remova resíduos técnicos.",
      "Responda SOMENTE em JSON válido.",
      'Formato: {"meaningPt":"... ou null","contextualPt":"... ou null"}',
      "",
      `Strong: ${strong || "(ausente)"}`,
      `Glosa lexical: ${needMeaning ? sourceGloss : "(já em cache ou ausente)"}`,
      `Tradução contextual: ${
        needContextual
          ? sourceContextual
          : "(já em cache ou ausente)"
      }`,
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;

    try {
      response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            input: instructions,
            max_output_tokens: 160,
          }),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error(
        "Erro OpenAI ao traduzir dados lexicais:",
        response.status,
        (await response.text()).slice(0, 400),
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível traduzir os dados lexicais neste momento.",
        },
        { status: 502 },
      );
    }

    const parsed = parseJsonObject(
      extractResponseText(await response.json()),
    );

    if (
      needMeaning &&
      typeof parsed.meaningPt === "string" &&
      parsed.meaningPt.trim()
    ) {
      meaningPt = parsed.meaningPt.trim();

      const { error: cacheError } = await supabase
        .from("bible_strong_meanings_pt")
        .upsert(
          {
            strong,
            meaning_pt: meaningPt,
            source_gloss: sourceGloss,
            model,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "strong" },
        );

      if (cacheError) {
        console.error(
          "Falha ao cachear sentido básico em português:",
          cacheError,
        );
      }
    }

    if (
      needContextual &&
      typeof parsed.contextualPt === "string" &&
      parsed.contextualPt.trim()
    ) {
      contextualPt = parsed.contextualPt.trim();

      const { error: cacheError } = await supabase
        .from("bible_word_context_pt")
        .upsert(
          {
            word_id: word.id,
            contextual_pt: contextualPt,
            source_contextual: sourceContextual,
            model,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "word_id" },
        );

      if (cacheError) {
        console.error(
          "Falha ao cachear tradução contextual em português:",
          cacheError,
        );
      }
    }

    return NextResponse.json({
      meaningPt,
      contextualPt,
      cached: false,
      model,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return NextResponse.json(
        {
          error:
            "A tradução lexical demorou demais. Tente novamente.",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado.",
      },
      { status: 500 },
    );
  }
}
