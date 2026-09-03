/**
 * Tabela canônica de limites de versículos por capítulo, usada pelo
 * parser de referências (`src/lib/search/referenceParser.ts`) para
 * validar o versículo final de uma referência — Marco 1.2, ponto 3.
 *
 * FONTE: contagem tradicional de versículos por capítulo (a mesma
 * versificação usada pela maioria das edições em português — ARA, NVI,
 * ACF — e por praticamente todo software bíblico ocidental), fato
 * público e estável, não uma opinião nem dado inventado.
 *
 * ESCOPO — DELIBERADAMENTE PARCIAL: esta tabela cobre apenas os
 * capítulos citados pelos estudos mockados (`src/lib/data/studies.ts`)
 * mais alguns capítulos de referência amplamente conhecidos (Salmo 23,
 * Gênesis 1, Judas, Filemom), todos com contagem de alta confiança.
 * NÃO cobre os ~1189 capítulos da Bíblia inteira.
 *
 * Por que parcial, de propósito: transcrever de memória os ~1189
 * capítulos restantes seria um risco real de erro silencioso — exatamente
 * o tipo de dado que este projeto não pode arriscar "inventar". Antes da
 * Fase 3 (importação do acervo real), esta tabela deve ser substituída
 * ou completada a partir de uma fonte verificável e versionada (ex.:
 * dados de versificação USFM/OSIS de um projeto de código aberto
 * auditável, ou exportação de uma API bíblica licenciada) — nunca por
 * transcrição manual adicional.
 *
 * COMPORTAMENTO quando o capítulo não está nesta tabela: o parser NÃO
 * rejeita a referência por causa do limite de versículo — apenas não
 * consegue confirmá-lo, e continua validando o que já validava antes
 * (capítulo dentro do livro, versículo >= 1, intervalo não invertido).
 * Isso evita dois erros piores que inventar o limite: (a) rejeitar uma
 * referência válida por um número errado, ou (b) fingir uma cobertura
 * total que não existe.
 *
 * Versão desta tabela: v1 (Marco 1.2).
 */
export const VERSE_LIMITS: Readonly<Record<string, Readonly<Record<number, number>>>> = {
  genesis: { 1: 31 },
  salmos: { 23: 6 },
  proverbios: { 31: 31 },
  joao: { 3: 36, 21: 25 },
  lucas: { 15: 32 },
  romanos: { 8: 39 },
  efesios: { 6: 24 },
  tiago: { 1: 27 },
  apocalipse: { 21: 27 },
  filemom: { 1: 25 },
  judas: { 1: 25 },
};

/**
 * Último versículo válido de um capítulo, ou `undefined` se este
 * capítulo ainda não está documentado em `VERSE_LIMITS` (ver escopo
 * acima) — `undefined` significa "não sei", nunca "sem limite".
 */
export function getMaxVerse(bookSlug: string, capitulo: number): number | undefined {
  return VERSE_LIMITS[bookSlug]?.[capitulo];
}
