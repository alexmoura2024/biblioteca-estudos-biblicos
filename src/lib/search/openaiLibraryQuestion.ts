import "server-only";

import { prepareLibraryQuestion } from "@/lib/search/libraryQuestion";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-luna";

interface ResponsesPayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

function extractText(payload: ResponsesPayload): string {
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

export async function rewriteLibraryQuestionWithOpenAI(
  question: string,
): Promise<string | undefined> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return undefined;

  const model =
    process.env.OPENAI_LIBRARY_MODEL?.trim() || DEFAULT_MODEL;

  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 64,
        instructions:
          "Você é apenas um reformulador de busca para uma biblioteca de estudos bíblicos. " +
          "NÃO responda à pergunta, NÃO explique teologia e NÃO acrescente fatos. " +
          "Devolva somente de 1 a 4 termos centrais de pesquisa em português, " +
          "separados por espaço. Preserve nomes próprios e conceitos bíblicos. " +
          "Remova frases conversacionais, palavras genéricas, aspas e pontuação.",
        input: question,
      }),
    });

    if (!response.ok) return undefined;

    const payload = (await response.json()) as ResponsesPayload;
    const raw = extractText(payload)
      .split(/\r?\n/, 1)[0]
      .replace(/^[`"'“”]+|[`"'“”]+$/g, "")
      .trim()
      .slice(0, 160);

    const prepared = prepareLibraryQuestion(raw);
    return prepared || undefined;
  } catch {
    return undefined;
  }
}
