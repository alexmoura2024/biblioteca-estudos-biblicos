import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-luna";

export const maxDuration = 120;

interface ResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

interface CatalogEntity {
  id: string;
  name: string;
  description: string;
}

interface RawSuggestion {
  id?: string;
  reason?: string;
  confidence?: string;
}

interface RawClassification {
  topics?: RawSuggestion[];
  characters?: RawSuggestion[];
  series?: RawSuggestion[];
}

function outputText(payload: ResponsesPayload): string {
  if (payload.output_text?.trim()) return payload.output_text.trim();

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) {
        return content.text.trim();
      }
    }
  }

  return "";
}

function compactEditorialInput(value: string): string {
  const timestampClock = /^\d{1,2}:\d{2}$/;
  const timestampWords =
    /^\d+\s+(?:segundo|segundos|minuto|minutos)(?:\s+e\s+\d+\s+(?:segundo|segundos))?$/i;

  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const unwrapped =
        trimmed.startsWith("**") &&
        trimmed.endsWith("**") &&
        trimmed.length > 4
          ? trimmed.slice(2, -2).trim()
          : trimmed;

      if (
        timestampClock.test(unwrapped) ||
        timestampWords.test(unwrapped)
      ) {
        return "";
      }

      return unwrapped
        .replace(/\[m[úu]sica\]/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toCatalog(
  rows: Array<Record<string, unknown>> | null,
): CatalogEntity[] {
  return (rows ?? []).map((row) => ({
    id: String(row.id ?? ""),
    name: String(row.nome ?? ""),
    description: String(row.descricao ?? ""),
  }));
}

function catalogText(
  title: string,
  catalog: CatalogEntity[],
): string {
  if (catalog.length === 0) return `${title}:\n(vazio)`;

  return [
    `${title}:`,
    ...catalog.map((item) => {
      const description = item.description
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);

      return `${item.id}\t${item.name}${
        description ? `\t${description}` : ""
      }`;
    }),
  ].join("\n");
}

function parseClassificationJson(text: string): RawClassification {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start < 0 || end < start) {
    throw new Error("A IA não devolveu uma classificação estruturada.");
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as RawClassification;
}

function normalizeSuggestions(
  raw: RawSuggestion[] | undefined,
  catalog: CatalogEntity[],
  limit: number,
) {
  const catalogById = new Map(
    catalog.map((item) => [item.id, item]),
  );
  const seen = new Set<string>();
  const normalized: Array<{
    id: string;
    name: string;
    reason: string;
    confidence: "alta" | "media";
  }> = [];

  for (const suggestion of Array.isArray(raw) ? raw : []) {
    const id = suggestion?.id?.trim() || "";
    const entity = catalogById.get(id);

    if (!entity || seen.has(id)) continue;

    const confidenceRaw = (suggestion.confidence || "")
      .trim()
      .toLowerCase();

    const confidence: "alta" | "media" =
      confidenceRaw === "alta" ? "alta" : "media";

    normalized.push({
      id,
      name: entity.name,
      reason: (suggestion.reason || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 240),
      confidence,
    });

    seen.add(id);
    if (normalized.length >= limit) break;
  }

  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase administrativo não configurado." },
        { status: 503 },
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no servidor." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      titulo?: string;
      resumo?: string;
      conteudo?: string;
      referencia?: string;
      palavras_chave?: string;
    };

    const content = compactEditorialInput(body.conteudo || "");
    if (!content) {
      return NextResponse.json(
        { error: "Escreva ou cole o estudo antes de classificar." },
        { status: 400 },
      );
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [topicsResult, charactersResult, seriesResult] =
      await Promise.all([
        supabase
          .from("topics")
          .select("id,nome,descricao")
          .order("nome", { ascending: true }),
        supabase
          .from("characters")
          .select("id,nome,descricao")
          .order("nome", { ascending: true }),
        supabase
          .from("series")
          .select("id,nome,descricao")
          .order("nome", { ascending: true }),
      ]);

    if (topicsResult.error) {
      throw new Error(
        `Erro ao carregar temas: ${topicsResult.error.message}`,
      );
    }

    if (charactersResult.error) {
      throw new Error(
        `Erro ao carregar personagens: ${charactersResult.error.message}`,
      );
    }

    if (seriesResult.error) {
      throw new Error(
        `Erro ao carregar séries: ${seriesResult.error.message}`,
      );
    }

    const topics = toCatalog(
      (topicsResult.data ?? []) as Array<Record<string, unknown>>,
    );
    const characters = toCatalog(
      (charactersResult.data ?? []) as Array<Record<string, unknown>>,
    );
    const series = toCatalog(
      (seriesResult.data ?? []) as Array<Record<string, unknown>>,
    );

    const input = [
      body.titulo?.trim()
        ? `TÍTULO: ${body.titulo.trim()}`
        : "",
      body.referencia?.trim()
        ? `REFERÊNCIA PRINCIPAL: ${body.referencia.trim()}`
        : "",
      body.resumo?.trim()
        ? `RESUMO: ${body.resumo.trim()}`
        : "",
      body.palavras_chave?.trim()
        ? `PALAVRAS-CHAVE: ${body.palavras_chave.trim()}`
        : "",
      `CONTEÚDO:\n${content.slice(0, 60000)}`,
      catalogText("CATÁLOGO DE TEMAS", topics),
      catalogText("CATÁLOGO DE PERSONAGENS", characters),
      catalogText("CATÁLOGO DE SÉRIES", series),
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model:
          process.env.OPENAI_LIBRARY_MODEL?.trim() ||
          DEFAULT_MODEL,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 1400,
        instructions:
          "Você é o classificador editorial da Biblioteca Virtual de Estudos Bíblicos. " +
          "Sua função é SUGERIR vínculos, nunca criá-los nem aplicá-los. " +
          "Use SOMENTE entidades presentes nos catálogos fornecidos e devolva os IDs exatos. " +
          "Temas: sugira de 2 a 6 temas realmente centrais, evitando termos apenas incidentais. " +
          "Personagens: sugira de 0 a 6 personagens explicitamente nomeados ou claramente centrais no estudo. " +
          "Séries: sugira de 0 a 3 séries SOMENTE quando houver encaixe editorial forte; se houver dúvida, deixe a lista vazia. " +
          "Não invente tema, personagem ou série. Não use conhecimento externo para criar vínculos inexistentes. " +
          "Para cada sugestão informe uma justificativa curta e confiança 'alta' ou 'media'. " +
          "Retorne SOMENTE JSON válido, sem Markdown, exatamente neste formato: " +
          '{"topics":[{"id":"UUID","reason":"motivo","confidence":"alta"}],"characters":[],"series":[]}.',
        input,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `A IA de classificação respondeu com status ${response.status}.`,
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as ResponsesPayload;
    const result = outputText(payload);

    if (!result) {
      return NextResponse.json(
        { error: "A IA não devolveu classificação utilizável." },
        { status: 502 },
      );
    }

    const parsed = parseClassificationJson(result);

    return NextResponse.json({
      topics: normalizeSuggestions(parsed.topics, topics, 6),
      characters: normalizeSuggestions(
        parsed.characters,
        characters,
        6,
      ),
      series: normalizeSuggestions(parsed.series, series, 3),
      catalogCounts: {
        topics: topics.length,
        characters: characters.length,
        series: series.length,
      },
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return NextResponse.json(
      {
        error: isTimeout
          ? "A classificação excedeu o tempo limite. Tente novamente."
          : error instanceof Error
            ? error.message
            : "Erro inesperado na classificação editorial.",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
