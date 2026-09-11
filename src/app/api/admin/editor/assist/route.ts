import { NextRequest, NextResponse } from "next/server";
import {
  searchRepository,
  studyRepository,
} from "@/lib/repositories";
import { prepareLibraryQuestion } from "@/lib/search/libraryQuestion";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-luna";

export const maxDuration = 120;

type EditorialAction =
  | "format_markdown"
  | "review_portuguese"
  | "organize_structure"
  | "generate_summary"
  | "suggest_title"
  | "suggest_keywords"
  | "detect_references"
  | "dictionary";

type TargetField =
  | "conteudo"
  | "resumo"
  | "titulo"
  | "palavras_chave"
  | "none";

interface ResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
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

function actionConfig(action: EditorialAction): {
  target: TargetField;
  maxOutputTokens: number;
  instruction: string;
} {
  switch (action) {
    case "format_markdown":
      return {
        target: "conteudo",
        maxOutputTokens: 6500,
        instruction:
          "Converta o estudo fornecido para Markdown editorial limpo. " +
          "PRESERVE integralmente as ideias, doutrina, argumentos, exemplos, " +
          "citações e referências bíblicas. Não acrescente teologia, não resuma " +
          "e não reescreva o sentido. Organize títulos e listas quando já forem " +
          "evidentes. Use obrigatoriamente **Introdução**, **Desenvolvimento** e " +
          "**Conclusão** em negrito quando essas partes puderem ser identificadas. " +
          "Retorne SOMENTE o Markdown pronto, sem comentários.",
      };
    case "review_portuguese":
      return {
        target: "conteudo",
        maxOutputTokens: 6500,
        instruction:
          "Revise somente ortografia, pontuação, concordância e clareza gramatical " +
          "do texto fornecido. Preserve a teologia, o vocabulário doutrinário, as " +
          "citações, as referências bíblicas e a sequência argumentativa. Não " +
          "adicione novas ideias nem remova afirmações. Retorne SOMENTE o texto revisado.",
      };
    case "organize_structure":
      return {
        target: "conteudo",
        maxOutputTokens: 7500,
        instruction:
          "Reescreva e organize o texto como uma MENSAGEM EXPOSITIVA bíblica, " +
          "mantendo rigorosamente o contexto, a essência, a doutrina, a linha de " +
          "raciocínio e a intenção pastoral do material original. Use SOMENTE o " +
          "conteúdo fornecido: não acrescente interpretações externas, referências " +
          "bíblicas novas, doutrina nova, fatos históricos ou aplicações que não " +
          "estejam sustentadas pelo texto original. Preserve todas as referências " +
          "bíblicas, citações, imagens espirituais e pontos doutrinários importantes. " +
          "Melhore a redação, a coesão e as transições para que a mensagem fique " +
          "naturalmente expositiva, desenvolvendo o texto bíblico em sequência e " +
          "mostrando com clareza o ensino central. Remova apenas artefatos evidentes " +
          "de transcrição oral, como [música], repetições vazias, interrupções e " +
          "chamadas litúrgicas que não acrescentem conteúdo à mensagem. Não resuma " +
          "nem reduza de forma significativa. Estruture obrigatoriamente em Markdown " +
          "com **Introdução**, **Desenvolvimento** e **Conclusão**. Dentro do " +
          "Desenvolvimento, quando o próprio material permitir, use subtítulos " +
          "expositivos curtos para acompanhar a progressão do texto bíblico. " +
          "Retorne SOMENTE a mensagem reescrita em Markdown, sem comentários sobre " +
          "o processo editorial.",
      };
    case "generate_summary":
      return {
        target: "resumo",
        maxOutputTokens: 280,
        instruction:
          "Crie um resumo editorial de 2 a 4 frases usando somente o conteúdo " +
          "fornecido. Descreva o assunto, texto bíblico central e ênfase da mensagem. " +
          "Não invente aplicações nem doutrina. Retorne SOMENTE o resumo.",
      };
    case "suggest_title":
      return {
        target: "titulo",
        maxOutputTokens: 100,
        instruction:
          "Sugira UM título editorial sóbrio e fiel ao conteúdo. Se já houver um " +
          "bom título, aperfeiçoe-o minimamente. Não crie linguagem sensacionalista. " +
          "Retorne SOMENTE o título, sem aspas.",
      };
    case "suggest_keywords":
      return {
        target: "palavras_chave",
        maxOutputTokens: 140,
        instruction:
          "Extraia de 4 a 8 palavras-chave realmente presentes ou claramente " +
          "centrais no estudo. Não invente temas. Retorne SOMENTE uma lista separada " +
          "por vírgulas.",
      };
    case "detect_references":
      return {
        target: "none",
        maxOutputTokens: 500,
        instruction:
          "Detecte referências bíblicas no texto fornecido. Inclua: (1) referências " +
          "escritas explicitamente e (2) citações bíblicas literais cuja referência " +
          "possa ser identificada com alta confiança. Não invente referências para " +
          "frases devocionais ou paráfrases incertas. Retorne SOMENTE uma lista, uma " +
          "referência por linha, no formato Livro capítulo:versículo ou " +
          "Livro capítulo:versículo-versículo. Se não houver identificação segura, " +
          "retorne exatamente: Nenhuma referência adicional identificada com segurança.",
      };
    case "dictionary":
      return {
        target: "none",
        maxOutputTokens: 450,
        instruction:
          "Atue como dicionário interno do acervo. Defina o termo solicitado usando " +
          "EXCLUSIVAMENTE os estudos fornecidos como EVIDÊNCIA DO ACERVO. Informe " +
          "brevemente o sentido encontrado no acervo e, quando houver, referências " +
          "bíblicas explicitamente citadas nas fontes. Se o acervo não sustentar uma " +
          "definição, diga isso claramente. Não use conhecimento externo.",
      };
  }
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

function actionTimeoutMs(action: EditorialAction): number {
  if (
    action === "format_markdown" ||
    action === "review_portuguese" ||
    action === "organize_structure"
  ) {
    return 90000;
  }

  return 45000;
}

async function buildDictionaryEvidence(term: string) {
  const query = prepareLibraryQuestion(term);
  if (!query) return { evidence: "", sources: [] as Array<{ title: string; slug: string }> };

  const outcome = await searchRepository.search({
    texto: query,
    mode: "strict",
    page: 1,
    limit: 5,
  });

  const fullStudies = (
    await Promise.all(
      outcome.items.map(({ study }) =>
        studyRepository.getPublishedBySlug(study.slug),
      ),
    )
  ).filter((study): study is NonNullable<typeof study> => Boolean(study));

  const sources = fullStudies.map((study) => ({
    title: study.titulo,
    slug: study.slug,
  }));

  const evidence = fullStudies
    .map((study, index) => {
      const refs = study.passagens
        .map(({ passage }) => passage.referenciaNormalizada)
        .slice(0, 8)
        .join("; ");

      return [
        `[FONTE ${index + 1}] ${study.titulo}`,
        refs ? `REFERÊNCIAS: ${refs}` : "",
        `RESUMO: ${study.resumo}`,
        `CONTEÚDO: ${study.conteudo.slice(0, 4500)}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  return { evidence, sources };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no servidor." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      action?: EditorialAction;
      titulo?: string;
      conteudo?: string;
      resumo?: string;
      referencia?: string;
      selected_text?: string;
      term?: string;
    };

    const action = body.action;
    if (
      !action ||
      ![
        "format_markdown",
        "review_portuguese",
        "organize_structure",
        "generate_summary",
        "suggest_title",
        "suggest_keywords",
        "detect_references",
        "dictionary",
      ].includes(action)
    ) {
      return NextResponse.json(
        { error: "Ação editorial inválida." },
        { status: 400 },
      );
    }

    const config = actionConfig(action);
    let sources: Array<{ title: string; slug: string }> = [];
    let input = [
      body.titulo?.trim() ? `TÍTULO ATUAL: ${body.titulo.trim()}` : "",
      body.referencia?.trim()
        ? `REFERÊNCIA PRINCIPAL: ${body.referencia.trim()}`
        : "",
      body.resumo?.trim() ? `RESUMO ATUAL: ${body.resumo.trim()}` : "",
      body.selected_text?.trim()
        ? `TRECHO SELECIONADO:\n${body.selected_text.trim().slice(0, 4000)}`
        : "",
      body.conteudo?.trim()
        ? `CONTEÚDO:\n${compactEditorialInput(
            body.conteudo,
          ).slice(0, 80000)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (action === "dictionary") {
      const term = body.term?.trim() || body.selected_text?.trim() || "";
      if (!term) {
        return NextResponse.json(
          { error: "Selecione ou informe um termo para o dicionário." },
          { status: 400 },
        );
      }

      const dictionary = await buildDictionaryEvidence(term);
      sources = dictionary.sources;

      if (!dictionary.evidence) {
        return NextResponse.json({
          result:
            "Não encontrei material suficiente no acervo publicado para definir esse termo.",
          target: "none",
          sources: [],
        });
      }

      input = `TERMO: ${term}\n\nEVIDÊNCIA DO ACERVO:\n${dictionary.evidence}`;
    } else if (!body.conteudo?.trim()) {
      return NextResponse.json(
        { error: "Escreva ou cole algum conteúdo antes de usar a IA editorial." },
        { status: 400 },
      );
    }

    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(actionTimeoutMs(action)),
      body: JSON.stringify({
        model:
          process.env.OPENAI_LIBRARY_MODEL?.trim() || DEFAULT_MODEL,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: config.maxOutputTokens,
        instructions:
          "Você é uma ferramenta editorial da Biblioteca Virtual de Estudos Bíblicos. " +
          "Nunca publique nem aplique alterações por conta própria. Sua saída será " +
          "mostrada como sugestão para aprovação humana. " +
          config.instruction,
        input,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `A IA editorial respondeu com status ${response.status}.` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as ResponsesPayload;
    const result = outputText(payload);

    if (!result) {
      return NextResponse.json(
        { error: "A IA não devolveu uma sugestão utilizável." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      result,
      target: config.target,
      sources,
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return NextResponse.json(
      {
        error: isTimeout
          ? "A mensagem exigiu mais tempo do que o limite editorial. O texto foi pré-limpo automaticamente; tente novamente. Se persistir, use primeiro Preparar Markdown e depois Organizar mensagem expositiva."
          : error instanceof Error
            ? error.message
            : "Erro inesperado na ferramenta editorial.",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
