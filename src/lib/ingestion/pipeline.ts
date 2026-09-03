import { createHash } from "node:crypto";
import { extractText } from "@/lib/ingestion/extract";
import { suggestKeywords, suggestSummary } from "@/lib/ingestion/metadataSuggestion";
import { normalizeExtractedText } from "@/lib/ingestion/normalizeExtractedText";
import type { ManifestRow } from "@/lib/ingestion/manifest";
import { classifyReferences, scanReferences, selectMainReference, type ClassifiedReference, type DetectedReference } from "@/lib/ingestion/referenceScan";
import type { IngestionRepository, StudyPassageInput } from "@/lib/ingestion/repository";
import type { SourceAdapter } from "@/lib/ingestion/sources/types";
import { normalizeText, slugify } from "@/lib/search/normalize";
import type { Character, Topic } from "@/lib/types";

/**
 * Orquestrador da pipeline de ingestão (Fase 3, Etapa 4/9 do protocolo).
 * Só conhece `SourceAdapter`/`IngestionRepository` (interfaces) — nunca
 * Drive nem Supabase diretamente, o que permite testar toda a lógica
 * (idempotência, nunca-publica-sozinho, referência impossível, falha de
 * extração) com os duplos de teste (`sources/inMemoryAdapter.ts`,
 * `repository.inMemory.ts`), sem rede nem banco real.
 *
 * REGRA ESTRUTURAL (não só de convenção): `UpsertStudyInput.status` em
 * `repository.ts` é tipado como `Extract<StatusEditorial, "DRAFT" |
 * "REVIEW">` — o TypeScript em si impede este módulo de tentar criar um
 * estudo `PUBLISHED`, não é preciso confiar só em disciplina de código.
 */

export interface IngestFileParams {
  manifestRow: ManifestRow;
  sourceAdapter: SourceAdapter;
  repository: IngestionRepository;
  /** Catálogo de temas já existente, para sugestão por nome (Etapa 4 item 9). */
  topics: Topic[];
  /** Catálogo de personagens já existente, para sugestão por nome (Etapa 4 item 10). */
  characters: Character[];
}

export type IngestionOutcome =
  | {
      outcome: "processado";
      fileId: string;
      studyId: string;
      status: "DRAFT" | "REVIEW";
      passagensValidas: ClassifiedReference[];
      referenciasInvalidas: DetectedReference[];
      /** Alertas de divergência entre o que o manifesto presumia e o que o CONTEÚDO real sustenta — nunca corrigidos sozinhos, sempre para revisão humana. */
      divergencias: string[];
    }
  | { outcome: "falha"; fileId?: string; stage: string; motivo: string }
  | { outcome: "nao_suportado"; fileId: string; motivo: string };

function suggestTopicIds(texto: string, topics: Topic[]): string[] {
  const normalized = normalizeText(texto);
  return topics.filter((topic) => normalized.includes(normalizeText(topic.nome))).map((topic) => topic.id);
}

function suggestCharacterIds(texto: string, characters: Character[]): string[] {
  const normalized = normalizeText(texto);
  return characters.filter((character) => normalized.includes(normalizeText(character.nome))).map((character) => character.id);
}

function toStudyPassageInputs(classified: ClassifiedReference[]): StudyPassageInput[] {
  return classified.map((ref) => ({
    bookSlug: ref.book.slug,
    capitulo: ref.capitulo,
    versiculoInicio: ref.versiculoInicio,
    versiculoFim: ref.versiculoFim,
    referenciaNormalizada:
      ref.versiculoInicio === undefined
        ? `${ref.book.nome} ${ref.capitulo}`
        : `${ref.book.nome} ${ref.capitulo}:${ref.versiculoInicio}${ref.versiculoFim && ref.versiculoFim !== ref.versiculoInicio ? `-${ref.versiculoFim}` : ""}`,
    tipoRelacao: ref.tipoRelacao,
    prioridade: ref.prioridade,
  }));
}

export async function ingestFile({ manifestRow, sourceAdapter, repository, topics, characters }: IngestFileParams): Promise<IngestionOutcome> {
  // 1) Registrar proveniência ANTES de tentar buscar o conteúdo — mesmo
  // uma falha de fetch precisa de um `files.id` para logar o job contra.
  const file = await repository.upsertFile({
    driveFileId: manifestRow.driveFileId,
    nomeOriginal: manifestRow.title,
    mimeType: manifestRow.mimeType,
    driveUrl: manifestRow.sourceUrl,
  });

  // 2) FETCH
  let sourceFile;
  try {
    sourceFile = await sourceAdapter.fetchFile(manifestRow.driveFileId);
    await repository.logJobStage(file.id, "FETCH", "SUCCESS");
    // Só grava modified_time/tamanho quando o adaptador confirma que são
    // metadados do ORIGINAL (nunca de uma cópia técnica exportada — ver
    // o comentário de `recordFetchMetadata` em repository.ts).
    await repository.recordFetchMetadata(file.id, { modifiedTime: sourceFile.modifiedTime, tamanhoBytes: sourceFile.tamanhoBytes });
  } catch (error) {
    const motivo = (error as Error).message;
    await repository.logJobStage(file.id, "FETCH", "FAILED", { errorMessage: motivo });
    await repository.updateFileStatus(file.id, "FALHA_EXTRACAO");
    return { outcome: "falha", fileId: file.id, stage: "FETCH", motivo };
  }

  // 3) EXTRACT — nunca lança; roteia por MIME type real do arquivo obtido.
  const extraction = await extractText(sourceFile.buffer, sourceFile.mimeType);
  if (extraction.status === "nao_suportado") {
    await repository.logJobStage(file.id, "EXTRACT", "SKIPPED", { errorMessage: extraction.motivo });
    await repository.updateFileStatus(file.id, "NAO_SUPORTADO");
    return { outcome: "nao_suportado", fileId: file.id, motivo: extraction.motivo };
  }
  if (extraction.status === "falha") {
    await repository.logJobStage(file.id, "EXTRACT", "FAILED", { errorMessage: extraction.motivo });
    await repository.updateFileStatus(file.id, "FALHA_EXTRACAO");
    return { outcome: "falha", fileId: file.id, stage: "EXTRACT", motivo: extraction.motivo };
  }
  await repository.logJobStage(file.id, "EXTRACT", "SUCCESS");

  // 4) NORMALIZE
  const textoNormalizado = normalizeExtractedText(extraction.texto);
  await repository.logJobStage(file.id, "NORMALIZE", "SUCCESS");
  const hashConteudo = createHash("sha256").update(textoNormalizado).digest("hex");
  await repository.updateFileStatus(file.id, "EXTRAIDO", { hashConteudo });

  // 5) REFERENCE_DETECTION — nunca aceita referência impossível como
  // válida (mesma regra do parser da busca, CLAUDE.md §3); referências
  // inválidas ficam disponíveis no resultado para alertar a revisão
  // humana, nunca viram uma linha de study_passages.
  const detected = scanReferences(textoNormalizado);
  const validDetected = detected.filter((ref) => ref.valid);
  const mainSelection = selectMainReference(validDetected, textoNormalizado, manifestRow.preliminaryReference);
  const classified = classifyReferences(detected, mainSelection.main);
  const referenciasInvalidas = detected.filter((ref) => !ref.valid);
  await repository.logJobStage(file.id, "REFERENCE_DETECTION", "SUCCESS");

  // Divergências entre o que o manifesto presumia e o que o CONTEÚDO
  // real sustenta — nunca corrigidas/movidas sozinhas, só reportadas
  // para decisão humana (Etapa 7: "extrair do conteúdo, nunca forçar
  // pelo título/pasta").
  const divergencias: string[] = [];
  const principal = classified[0];

  // Fase 3.1 (checkpoint 14): quando `selectMainReference` não encontra
  // evidência clara o bastante para escolher entre 2+ referências
  // candidatas (Prioridades A/B/C todas inconclusivas), o resultado
  // ainda precisa de UM valor para preencher `study_passages` (Prioridade
  // D, fallback determinístico) — mas a incerteza real nunca fica
  // escondida: vira uma divergência explícita para a revisão humana
  // decidir, em vez de apresentar a escolha de fallback como um fato.
  if (mainSelection.reason === "ambiguous" && principal) {
    divergencias.push(
      `MAIN_REFERENCE_AMBIGUOUS: duas ou mais referências têm evidência semelhante para ser a referência principal ` +
        `(nenhum marcador explícito, título não confirma e nenhuma referência é claramente predominante no conteúdo). ` +
        `Escolhida "${principal.matchedText}" só como fallback determinístico (primeira em ordem de aparição) — requer confirmação editorial.`,
    );
  }

  // Caso "O evangelho eterno": o testamento indicado pelo caminho de
  // origem no manifesto não bate com o testamento do livro da
  // referência PRINCIPAL detectada no conteúdo.
  if (manifestRow.testament && principal && principal.book.testamento !== manifestRow.testament) {
    divergencias.push(
      `Origem classificada como ${manifestRow.testament} (${manifestRow.sourcePath}), mas a referência ` +
        `principal detectada no conteúdo (${principal.book.nome} ${principal.capitulo}) é do ${principal.book.testamento}. ` +
        "Não movido/renomeado automaticamente — requer decisão editorial.",
    );
  }

  // Caso "Caminho, Verdade e Vida" (SEL-009): a referência preliminar do
  // manifesto (geralmente extraída do TÍTULO do arquivo) não bate com a
  // referência principal que o CONTEÚDO realmente sustenta. Comparação
  // best-effort: só dispara quando a referência preliminar também é
  // reconhecível pelo mesmo scanner determinístico (nunca um "quase
  // igual" adivinhado).
  if (manifestRow.preliminaryReference && principal) {
    const preliminaryParsed = classifyReferences(scanReferences(manifestRow.preliminaryReference))[0];
    if (
      preliminaryParsed &&
      (preliminaryParsed.book.slug !== principal.book.slug ||
        preliminaryParsed.capitulo !== principal.capitulo ||
        preliminaryParsed.versiculoInicio !== principal.versiculoInicio)
    ) {
      divergencias.push(
        `Referência preliminar do manifesto ("${manifestRow.preliminaryReference}", geralmente do título/nome do ` +
          `arquivo) diverge da referência principal que o CONTEÚDO real sustenta (${principal.matchedText}). ` +
          "Título original preservado sem alteração — requer confirmação editorial de qual referência está correta.",
      );
    }
  }

  // 6) METADATA_SUGGESTION
  const resumo = suggestSummary(textoNormalizado);
  const palavrasChave = suggestKeywords(textoNormalizado);
  const topicIds = suggestTopicIds(textoNormalizado, topics);
  const characterIds = suggestCharacterIds(textoNormalizado, characters);
  await repository.logJobStage(file.id, "METADATA_SUGGESTION", "SUCCESS");

  // Estado inicial (Etapa 4 item 14): REVIEW quando a classificação
  // chegou a uma referência principal válida; DRAFT quando a extração
  // funcionou mas a classificação ficou incompleta (nenhuma referência
  // reconhecida com segurança) — nunca PUBLISHED (garantido pelo tipo
  // de UpsertStudyInput.status, não só por esta condição).
  const status: "DRAFT" | "REVIEW" = classified.length > 0 ? "REVIEW" : "DRAFT";

  // 7) UPSERT_STUDY — idempotente via files.study_id (ver repository.ts).
  // `studies.autor`/`studies.data_origem` são NOT NULL no schema (Fase 2)
  // — como a Etapa 7 proíbe inventar autor/data quando ausentes, usamos
  // sentinelas EXPLÍCITAS, nunca um valor plausível que poderia passar
  // despercebido na revisão humana: "Autor não identificado" (nunca um
  // nome real) e, na ausência de `modifiedTime` do Drive, a data-marco
  // 1970-01-01 (claramente reconhecível como "desconhecida", ao
  // contrário de usar a data de hoje, que pareceria uma informação real).
  const autor = "Autor não identificado";
  const dataOrigem = sourceFile.modifiedTime ? sourceFile.modifiedTime.slice(0, 10) : "1970-01-01";

  const { studyId } = await repository.upsertStudyForFile(file.id, {
    titulo: manifestRow.title,
    slug: slugify(manifestRow.title),
    resumo,
    conteudo: textoNormalizado,
    status,
    autor,
    dataOrigem,
    palavrasChave,
  });
  await repository.replaceStudyPassages(studyId, toStudyPassageInputs(classified));
  await repository.replaceStudyTopics(studyId, topicIds);
  await repository.replaceStudyCharacters(studyId, characterIds);
  await repository.logJobStage(file.id, "UPSERT_STUDY", "SUCCESS");
  await repository.updateFileStatus(file.id, "PROCESSADO", { studyId });

  return { outcome: "processado", fileId: file.id, studyId, status, passagensValidas: classified, referenciasInvalidas, divergencias };
}
