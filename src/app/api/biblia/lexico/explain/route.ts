import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

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

    const { data: cached } = await supabase
      .from("bible_lexical_explanations")
      .select("explanation,model")
      .eq("word_id", body.wordId)
      .maybeSingle();

    if (cached?.explanation) {
      return NextResponse.json({
        explanation: cached.explanation,
        cached: true,
        model: cached.model,
      });
    }

    if (!openAiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY não configurada para explicação contextual.",
        },
        { status: 503 },
      );
    }

    const { data: word, error: wordError } = await supabase
      .from("bible_original_words")
      .select(
        "id,book_id,chapter,verse,language,surface,transliteration,lemma,strong,strong_extended,morphology,gloss,contextual_translation,is_proper_name,books!inner(nome)",
      )
      .eq("id", body.wordId)
      .single();

    if (wordError || !word) {
      return NextResponse.json(
        { error: "Palavra original não encontrada." },
        { status: 404 },
      );
    }

    const { data: version } = await supabase
      .from("bible_versions")
      .select("id")
      .eq("code", "acf-private")
      .maybeSingle();

    let acfText = "";

    if (version?.id) {
      const { data: verseRow } = await supabase
        .from("bible_verses")
        .select("text")
        .eq("version_id", version.id)
        .eq("book_id", word.book_id)
        .eq("chapter", word.chapter)
        .eq("verse", word.verse)
        .maybeSingle();

      acfText =
        typeof verseRow?.text === "string"
          ? verseRow.text
          : "";
    }

    const nested = word.books as
      | Record<string, unknown>
      | Array<Record<string, unknown>>;
    const book = Array.isArray(nested) ? nested[0] : nested;
    const bookName = String(book?.nome || "");
    const reference = `${bookName} ${word.chapter}:${word.verse}`;

    const language =
      word.language === "he"
        ? "hebraico bíblico"
        : "grego koiné";

    const model =
      process.env.OPENAI_LIBRARY_MODEL || "gpt-5.6-luna";

    const systemPrompt = [
      "Você é o assistente lexical da Biblioteca Virtual de Estudos Bíblicos.",
      "Responda em português do Brasil.",
      "Use SOMENTE os dados linguísticos fornecidos no pedido e o texto ACF do versículo.",
      "Não invente etimologias, raízes ocultas, numerologia, simbolismos ou sentidos que não estejam sustentados pelos dados.",
      "Diferencie significado lexical de aplicação teológica.",
      "Se a glosa-base estiver em inglês, traduza-a com prudência para o português.",
      "Explique de modo conciso em três blocos: Sentido básico; Forma neste versículo; Observação de contexto.",
      "Quando a morfologia for apenas um código técnico e você não puder expandi-la com segurança, diga isso em vez de adivinhar.",
    ].join("\n");

    const userPrompt = [
      `Referência: ${reference}`,
      `Texto ACF: ${acfText || "(não disponível)"}`,
      `Idioma: ${language}`,
      `Forma no texto: ${word.surface}`,
      `Transliteração: ${word.transliteration || "(não disponível)"}`,
      `Lema: ${word.lemma || "(não disponível)"}`,
      `Strong: ${word.strong || "(não disponível)"}`,
      `Strong estendido: ${word.strong_extended || "(não disponível)"}`,
      `Morfologia: ${word.morphology || "(não disponível)"}`,
      `Glosa lexical STEPBible: ${word.gloss || "(não disponível)"}`,
      `Tradução contextual STEPBible: ${
        word.contextual_translation || "(não disponível)"
      }`,
      `Nome próprio: ${word.is_proper_name ? "sim" : "não"}`,
      "",
      "Explique esta palavra especificamente neste versículo.",
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

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
            input: [
              {
                role: "system",
                content: [
                  {
                    type: "input_text",
                    text: systemPrompt,
                  },
                ],
              },
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: userPrompt,
                  },
                ],
              },
            ],
            max_output_tokens: 500,
          }),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error(
        "Erro OpenAI na explicação lexical:",
        response.status,
        detail.slice(0, 500),
      );

      return NextResponse.json(
        { error: "A IA lexical não respondeu neste momento." },
        { status: 502 },
      );
    }

    const explanation = extractResponseText(
      await response.json(),
    );

    if (!explanation) {
      return NextResponse.json(
        { error: "A IA lexical retornou resposta vazia." },
        { status: 502 },
      );
    }

    const { error: cacheError } = await supabase
      .from("bible_lexical_explanations")
      .upsert(
        {
          word_id: word.id,
          explanation,
          model,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "word_id" },
      );

    if (cacheError) {
      console.error(
        "Explicação criada, mas não foi possível cachear:",
        cacheError,
      );
    }

    return NextResponse.json({
      explanation,
      cached: false,
      model,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return NextResponse.json(
        { error: "A explicação demorou demais. Tente novamente." },
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
