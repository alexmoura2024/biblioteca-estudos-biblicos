/**
 * Normalização de texto extraído (Fase 3, Etapa 4 item 4) — bem mais
 * conservadora que `src/lib/search/normalize.ts` (que remove acentos e
 * baixa a caixa para indexação de busca): aqui o texto vai virar
 * `studies.conteudo`, então precisa continuar legível e fiel ao
 * original. Só limpa ruído mecânico de extração (quebras de linha do
 * Windows, espaços redundantes, excesso de linhas em branco) — nunca
 * reescreve, resume ou corrige o conteúdo.
 */
export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
