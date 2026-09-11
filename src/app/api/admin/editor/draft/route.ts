import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  buildLibraryDraftEvidence,
  normalizeLibraryDraftOutput,
  parseLibraryDraftInput,
  selectLibraryDraftSources,
  type LibraryDraftEvidenceSource,
} from "@/lib/admin/libraryDraft";

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

interface StudySourceRow {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  conteudo: string | null;
  status: "PUBLISHED" | "REVIEW" | "DRAFT";
  autor: string | null;
  data_origem: string | null;
}

function outputText(payload: ResponsesPayload): string {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (
        content.type === "output_text" &&
        content.text?.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return "";
}

export async function POST(request: NextRequest) {
  let input;

  try {
    input = parseLibraryDraftInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pedido editorial inválido.",
      },
      { status: 400 },
    );
  }

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

  try {
    const supabase = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("studies")
      .select(
        "id, titulo, slug, resumo, conteudo, status, autor, data_origem",
      )
      .in("id", input.sourceIds)
      .in("status", ["PUBLISHED", "REVIEW", "DRAFT"])
      .not("autor", "ilike", "%Prototipo%");

    if (error) {
      throw new Error(
        `Erro ao carregar fontes: ${error.message}`,
      );
    }

    const availableSources = (data ?? []) as StudySourceRow[];
    const selectedSources = selectLibraryDraftSources(
      availableSources,
      input.sourceIds,
    );

    if (selectedSources.length !== input.sourceIds.length) {
      return NextResponse.json(
        {
          error:
            "Uma ou mais fontes selecionadas não estão disponíveis. Faça a busca novamente.",
        },
        { status: 400 },
      );
    }

    const evidenceSources: LibraryDraftEvidenceSource[] =
      selectedSources.map((source) => ({
        id: source.id,
        title: source.titulo,
        slug: source.slug,
        summary: source.resumo ?? "",
        content: source.conteudo ?? "",
        status: source.status,
        author: source.autor ?? undefined,
        originDate: source.data_origem ?? undefined,
      }));

    if (
      evidenceSources.every(
        (source) => !source.content.trim(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "As fontes selecionadas não possuem conteúdo suficiente para gerar um estudo.",
        },
        { status: 400 },
      );
    }

    const evidence = buildLibraryDraftEvidence(evidenceSources);

    const aiResponse = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(110000),
      body: JSON.stringify({
        model:
          process.env.OPENAI_LIBRARY_MODEL?.trim() ||
          DEFAULT_MODEL,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 6500,
        instructions:
          "Você é uma assistente editorial da Biblioteca Virtual de Estudos Bíblicos. " +
          "Crie um RASCUNHO de estudo bíblico atendendo ao pedido do autor. " +
          "Use EXCLUSIVAMENTE as fontes fornecidas. Não acrescente doutrinas, " +
          "interpretações, fatos históricos, referências bíblicas ou aplicações " +
          "externas ao material. Sintetize as fontes sem copiar mecanicamente " +
          "grandes trechos. Preserve a linha doutrinária, a intenção pastoral e " +
          "as referências presentes nos manuscritos. Se houver divergência entre " +
          "as fontes, não invente uma harmonização: marque discretamente " +
          "[REVISAR: divergência entre as fontes]. Se o material for insuficiente " +
          "para atender ao pedido, explique isso em vez de preencher lacunas. " +
          "Estruture obrigatoriamente em Markdown com **Introdução**, " +
          "**Desenvolvimento** e **Conclusão**. Não inclua relatório do processo, " +
          "numeração das fontes nem lista técnica de fontes dentro do estudo. " +
          "Retorne somente o texto do rascunho em Markdown.",
        input:
          `PEDIDO DO AUTOR:\n${input.request}\n\n` +
          `FONTES SELECIONADAS:\n${evidence}`,
      }),
    });

    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          error:
            `A IA editorial respondeu com status ${aiResponse.status}.`,
        },
        { status: 502 },
      );
    }

    const payload =
      (await aiResponse.json()) as ResponsesPayload;
    const result = normalizeLibraryDraftOutput(outputText(payload));

    if (!result) {
      return NextResponse.json(
        {
          error:
            "A IA não devolveu um rascunho utilizável.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      result,
      target: "conteudo",
      sources: selectedSources.map((source) => ({
        id: source.id,
        title: source.titulo,
        slug: source.slug,
        status: source.status,
      })),
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError");

    return NextResponse.json(
      {
        error: isTimeout
          ? "A geração excedeu o tempo limite. Tente novamente com menos fontes."
          : error instanceof Error
            ? error.message
            : "Erro inesperado ao gerar o rascunho.",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
