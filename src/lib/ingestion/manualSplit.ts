import type { FileRecord, IngestionRepository, StudyPassageInput, UpsertStudyInput } from "@/lib/ingestion/repository";
import { slugify } from "@/lib/search/normalize";

/**
 * Divisão de um arquivo-fonte em MÚLTIPLOS estudos — exclusivamente para
 * uma DECISÃO EDITORIAL HUMANA explícita (ver DEC-042 em
 * docs/DECISIONS.md), nunca uma inferência automática da pipeline
 * (CLAUDE.md §3, DEC-028: nada aqui detecta "duas mensagens" sozinho —
 * é o chamador, um humano lendo o conteúdo já extraído, quem decide
 * onde cortar, que título dar a cada parte e qual é a referência MAIN
 * de cada uma). Achado real que motivou isto: SEL-017 ("Aniquilará a
 * morte para sempre - Is25.8-9.doc") contém duas mensagens concatenadas
 * no mesmo documento — Isaías 25:8-9 e Lucas 24:18 — que o scanner
 * determinístico corretamente detecta como referências separadas, mas
 * que só um humano pode decidir que merecem virar dois `study`
 * distintos em vez de um único estudo com duas referências.
 *
 * Nunca altera/duplica o arquivo original do Drive — continua existindo
 * exatamente UMA linha em `files` para o `drive_file_id` original; o que
 * muda é só que ela passa a se relacionar com mais de um `study` (via
 * `study_files`, N:N, além do vínculo primário `files.study_id` que
 * continua apontando para a primeira parte).
 */

export interface ManualSplitPart {
  titulo: string;
  conteudo: string;
  resumo: string;
  palavrasChave: string[];
  /** Passagens deste estudo — deve conter exatamente uma com `tipoRelacao: "principal"` (a MAIN decidida pelo humano). */
  passagens: StudyPassageInput[];
  topicIds: string[];
  characterIds: string[];
}

export interface ManualSplitInput {
  autor: string;
  dataOrigem: string;
  /** Justificativa da decisão humana — registrada em `ingestion_jobs.error_message` para auditoria (nunca inventada, sempre o texto que o humano deu). */
  motivo: string;
  /** Ao menos 2 partes — a PRIMEIRA reaproveita o estudo já vinculado ao arquivo (se houver), as demais são sempre novas. */
  partes: ManualSplitPart[];
}

export interface ManualSplitResult {
  studyIds: string[];
  /** `true` quando o arquivo já estava `DIVIDIDO_MANUALMENTE` e nada foi recriado — prova de idempotência (INGESTION_SPEC.md §9, mesma regra da pipeline automática). */
  jaDividido: boolean;
}

function toUpsertInput(parte: ManualSplitPart, input: ManualSplitInput): UpsertStudyInput {
  return {
    titulo: parte.titulo,
    slug: slugify(parte.titulo),
    resumo: parte.resumo,
    conteudo: parte.conteudo,
    // Uma divisão manual só acontece sobre conteúdo já extraído com
    // sucesso e com referência(s) já identificadas pelo humano — nunca
    // DRAFT: se não houvesse referência clara o suficiente para decidir
    // separar, não haveria decisão de divisão para começo de conversa.
    // Nunca PUBLISHED (garantido pelo tipo de `UpsertStudyInput.status`,
    // não só aqui — mesma regra estrutural de `pipeline.ts`).
    status: "REVIEW",
    autor: input.autor,
    dataOrigem: input.dataOrigem,
    palavrasChave: parte.palavrasChave,
  };
}

/**
 * Executa a divisão. Idempotente: reexecutar com o MESMO `file` (já
 * marcado `DIVIDIDO_MANUALMENTE` de uma execução anterior) nunca cria
 * estudos novos — devolve os `study_id` já vinculados via `study_files`.
 */
export async function splitFileIntoStudies(repository: IngestionRepository, file: FileRecord, input: ManualSplitInput): Promise<ManualSplitResult> {
  if (input.partes.length < 2) {
    throw new Error("splitFileIntoStudies exige ao menos 2 partes — para um único estudo, use a pipeline normal (ingestFile).");
  }
  for (const parte of input.partes) {
    const principais = parte.passagens.filter((p) => p.tipoRelacao === "principal");
    if (principais.length !== 1) {
      throw new Error(`splitFileIntoStudies: a parte "${parte.titulo}" precisa de exatamente 1 passagem "principal" (MAIN) — encontradas ${principais.length}.`);
    }
  }

  if (file.statusProcessamento === "DIVIDIDO_MANUALMENTE") {
    const studyIds = await repository.listLinkedStudyIds(file.id);
    return { studyIds, jaDividido: true };
  }

  const studyIds: string[] = [];
  const [primeira, ...resto] = input.partes;

  // A primeira parte reaproveita o `study` já vinculado ao arquivo (via
  // `files.study_id`), se houver — nunca descarta um estudo já existente
  // só porque uma decisão editorial determinou que ele precisa virar
  // dois. Sem estudo prévio (arquivo ainda não processado), cria um novo
  // do mesmo jeito que as demais partes.
  const primeiroResultado = file.studyId
    ? await repository.upsertStudyForFile(file.id, toUpsertInput(primeira, input))
    : await repository.createStandaloneStudy(toUpsertInput(primeira, input));
  await repository.replaceStudyPassages(primeiroResultado.studyId, primeira.passagens);
  await repository.replaceStudyTopics(primeiroResultado.studyId, primeira.topicIds);
  await repository.replaceStudyCharacters(primeiroResultado.studyId, primeira.characterIds);
  await repository.linkStudyToFile(primeiroResultado.studyId, file.id, "ORIGEM_DIVIDIDA");
  studyIds.push(primeiroResultado.studyId);

  for (const parte of resto) {
    const { studyId } = await repository.createStandaloneStudy(toUpsertInput(parte, input));
    await repository.replaceStudyPassages(studyId, parte.passagens);
    await repository.replaceStudyTopics(studyId, parte.topicIds);
    await repository.replaceStudyCharacters(studyId, parte.characterIds);
    await repository.linkStudyToFile(studyId, file.id, "ORIGEM_DIVIDIDA");
    studyIds.push(studyId);
  }

  await repository.updateFileStatus(file.id, "DIVIDIDO_MANUALMENTE");
  await repository.logJobStage(file.id, "UPSERT_STUDY", "SUCCESS", {
    errorMessage: `DIVISÃO EDITORIAL HUMANA (DEC-042, nunca automática): ${input.motivo}`,
  });

  return { studyIds, jaDividido: false };
}
