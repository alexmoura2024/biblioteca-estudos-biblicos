/**
 * Resultado de uma tentativa de extração de texto (Fase 3, Etapa 4/5).
 *
 * Nunca "finge sucesso": um adaptador de formato devolve exatamente um
 * destes três estados, nunca lança para o chamador em uso normal — a
 * pipeline de ingestão precisa continuar processando o restante do lote
 * mesmo quando um arquivo específico falha (docs/fase3-piloto/
 * CLAUDE_FASE3_EXECUCAO_PILOTO.md, "Não simular sucesso").
 */
export type ExtractionOutcome =
  | { status: "sucesso"; texto: string; avisos: string[] }
  | { status: "falha"; motivo: string }
  | { status: "nao_suportado"; motivo: string };
