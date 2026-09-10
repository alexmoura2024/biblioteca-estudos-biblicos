import "server-only";

import type { Study } from "@/lib/types";

const DEFAULT_MODEL = "gpt-5.6-luna";
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_SOURCES = 8;
const MAX_CONTENT_CHARS = 7000;

interface ResponsesApiPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

interface ModelAnswer {
  answer?: string;
  source_ids?: string[];
  sufficient?: boolean;
  biblical_references?: Array<{
    reference?: string;
    source_id?: string;
  }>;
}

export interface GroundedLibraryAnswer {
  answer: string;
  sources: Array<{
    slug: string;
    titulo: string;
  }>;
  biblicalReferences: Array<{
    reference: string;
    sourceSlug: string;
    sourceTitle: string;
  }>;
}

function extractOutputText(payload: ResponsesApiPayload): string {
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

function normalizeEvidenceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Divide referências que eventualmente venham concatenadas pelo modelo,
 * por exemplo "Núm.6Jz. 13:5Lc. 1:15".
 *
 * A divisão é apenas de apresentação. Cada item ainda precisa passar pela
 * validação literal contra o estudo de origem antes de ser exibido.
 */
function splitAtomicBiblicalReferences(value: string): string[] {
  return value
    .trim()
    .replace(
      /[,;]\s*(?=(?:[1-3]|I{1,3})?\s*\p{Lu})/gu,
      "\n",
    )
    .replace(
      /(?<=\d)(?=(?:[1-3]|I{1,3})?\s*\p{Lu})/gu,
      "\n",
    )
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildEvidence(studies: Study[]): {
  input: string;
  sourceMap: Map<string, Study>;
} {
  const sourceMap = new Map<string, Study>();

  const blocks = studies.slice(0, MAX_SOURCES).map((study, index) => {
    const sourceId = `S${index + 1}`;
    sourceMap.set(sourceId, study);

    const refs = study.passagens
      .slice(0, 6)
      .map(({ passage }) => passage.referenciaNormalizada)
      .join("; ");

    return [
      `[${sourceId}]`,
      `TÍTULO: ${study.titulo}`,
      `SLUG: ${study.slug}`,
      refs ? `REFERÊNCIAS: ${refs}` : "",
      `RESUMO: ${study.resumo}`,
      "CONTEÚDO:",
      study.conteudo.slice(0, MAX_CONTENT_CHARS),
    ]
      .filter(Boolean)
      .join("\n");
  });

  return {
    input: blocks.join("\n\n---\n\n"),
    sourceMap,
  };
}

/**
 * Gera somente uma resposta sustentada por estudos recuperados.
 * A IA não recebe internet, Bíblia externa nem conhecimento adicional.
 */
export async function answerLibraryQuestionWithOpenAI(
  question: string,
  studies: Study[],
): Promise<GroundedLibraryAnswer | undefined> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || studies.length === 0) return undefined;

  const model =
    process.env.OPENAI_LIBRARY_MODEL?.trim() || DEFAULT_MODEL;

  const { input: evidence, sourceMap } = buildEvidence(studies);

  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 220,
        instructions:
          "Você responde perguntas usando EXCLUSIVAMENTE os estudos fornecidos. " +
          "Não use conhecimento externo, não complete lacunas e não faça inferências " +
          "que não estejam explicitamente sustentadas pelos textos. Se os estudos não " +
          "contiverem evidência suficiente para uma resposta direta, devolva sufficient=false. " +
          "Quando houver resposta, seja breve, fiel à formulação dos estudos e cite somente " +
          "os IDs das fontes efetivamente usadas. Identifique também referências bíblicas " +
          "que sustentem diretamente a resposta, mas SOMENTE quando estiverem escritas nos " +
          "estudos fornecidos. Copie cada referência EXATAMENTE como aparece na fonte; não " +
          "normalize, não converta abreviações e não invente versículos. IMPORTANTE: cada " +
          "objeto de biblical_references deve conter UMA ÚNICA referência. Nunca junte duas " +
          "ou mais referências na mesma string. Exemplo: Núm. 6:13, Jz. 13:5 e Lc. 1:15 " +
          "devem ser três objetos separados. Devolva SOMENTE JSON válido neste formato: " +
          "{\"sufficient\":true,\"answer\":\"resposta curta\",\"source_ids\":[\"S1\"]," +
          "\"biblical_references\":[{\"reference\":\"I Cro. 29:27\",\"source_id\":\"S1\"}]}. " +
          "Se não houver referência explícita, use \"biblical_references\":[]. " +
          "Se insuficiente: {\"sufficient\":false,\"answer\":\"\",\"source_ids\":[]," +
          "\"biblical_references\":[]}.",
        input:
          `PERGUNTA DO USUÁRIO:\n${question}\n\n` +
          `ESTUDOS RECUPERADOS:\n${evidence}`,
      }),
    });

    if (!response.ok) return undefined;

    const payload = (await response.json()) as ResponsesApiPayload;
    const raw = extractOutputText(payload)
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(raw) as ModelAnswer;

    if (
      parsed.sufficient !== true ||
      !parsed.answer?.trim() ||
      !Array.isArray(parsed.source_ids) ||
      parsed.source_ids.length === 0
    ) {
      return undefined;
    }

    const uniqueIds = [...new Set(parsed.source_ids)].slice(0, 4);
    const sources = uniqueIds
      .map((sourceId) => sourceMap.get(sourceId))
      .filter((study): study is Study => Boolean(study))
      .map((study) => ({
        slug: study.slug,
        titulo: study.titulo,
      }));

    if (sources.length === 0) return undefined;

    const biblicalReferences = (parsed.biblical_references ?? [])
      .flatMap((item) => {
        const study = item.source_id
          ? sourceMap.get(item.source_id)
          : undefined;

        if (!study || !item.reference?.trim()) {
          return [];
        }

        const evidenceText = normalizeEvidenceText(
          [
            study.resumo,
            study.conteudo,
            ...study.passagens.map(
              ({ passage }) => passage.referenciaNormalizada,
            ),
          ].join("\n"),
        );

        return splitAtomicBiblicalReferences(item.reference)
          .map((reference) => reference.slice(0, 80))
          .filter((reference) => /\d/.test(reference))
          .filter((reference) =>
            evidenceText.includes(normalizeEvidenceText(reference)),
          )
          .map((reference) => ({
            reference,
            sourceSlug: study.slug,
            sourceTitle: study.titulo,
          }));
      })
      .filter(
        (item, index, all) =>
          all.findIndex(
            (candidate) =>
              normalizeEvidenceText(candidate.reference) ===
                normalizeEvidenceText(item.reference) &&
              candidate.sourceSlug === item.sourceSlug,
          ) === index,
      )
      .slice(0, 6);

    return {
      answer: parsed.answer.trim().slice(0, 900),
      sources,
      biblicalReferences,
    };
  } catch {
    return undefined;
  }
}
