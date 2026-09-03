import { normalizeText } from "@/lib/search/normalize";
import type { ManifestRow } from "@/lib/ingestion/manifest";

/**
 * Diagnóstico de possível duplicidade (Fase 3, Etapa 8/5 do protocolo) —
 * SOMENTE DIAGNÓSTICO. Nunca funde, exclui ou escolhe automaticamente um
 * "vencedor" entre dois candidatos (docs/fase3-piloto/
 * CLAUDE_FASE3_EXECUCAO_PILOTO.md, regra 10; INGESTION_SPEC.md §8).
 * O resultado é sempre uma sugestão para revisão humana (Etapa 10).
 */
export type DuplicateClassification = "DUPLICATE_EXACT" | "POSSIBLE_DUPLICATE" | "DISTINCT";

export interface ContentSignal {
  /** Hash do conteúdo extraído (`files.hash_conteudo`), quando a extração já rodou. */
  hashConteudo?: string;
  /** Texto extraído já normalizado (`normalizeText`), para comparação aproximada. */
  textoNormalizado?: string;
}

export interface DuplicateDiagnosis {
  pilotIdA: string;
  pilotIdB: string;
  duplicateGroup: string;
  classification: DuplicateClassification;
  reason: string;
}

/**
 * Compara par a par os candidatos DENTRO do mesmo `duplicate_group` do
 * manifesto. `contentSignals` (por `pilot_id`) é opcional — sem ele
 * (situação desta sessão: nenhum conteúdo real foi extraído ainda), o
 * diagnóstico usa só metadados (título normalizado, `drive_file_id`,
 * referência preliminar), o que nunca é suficiente para `DUPLICATE_EXACT`
 * a não ser que o `drive_file_id` seja literalmente o mesmo (mesmo
 * arquivo do Drive) — é sempre conservador: na dúvida, `POSSIBLE_DUPLICATE`,
 * nunca `DISTINCT` nem `DUPLICATE_EXACT` sem evidência forte.
 */
export function diagnoseDuplicates(rows: ManifestRow[], contentSignals?: Map<string, ContentSignal>): DuplicateDiagnosis[] {
  const groups = new Map<string, ManifestRow[]>();
  for (const row of rows) {
    if (!row.duplicateGroup) continue;
    const list = groups.get(row.duplicateGroup) ?? [];
    list.push(row);
    groups.set(row.duplicateGroup, list);
  }

  const diagnoses: DuplicateDiagnosis[] = [];
  for (const [duplicateGroup, groupRows] of groups) {
    for (let i = 0; i < groupRows.length; i += 1) {
      for (let j = i + 1; j < groupRows.length; j += 1) {
        diagnoses.push(diagnosePair(groupRows[i], groupRows[j], duplicateGroup, contentSignals));
      }
    }
  }
  return diagnoses;
}

function diagnosePair(a: ManifestRow, b: ManifestRow, duplicateGroup: string, contentSignals?: Map<string, ContentSignal>): DuplicateDiagnosis {
  const base = { pilotIdA: a.pilotId, pilotIdB: b.pilotId, duplicateGroup };

  if (a.driveFileId && a.driveFileId === b.driveFileId) {
    return { ...base, classification: "DUPLICATE_EXACT", reason: "Mesmo drive_file_id — fisicamente o mesmo arquivo do Drive." };
  }

  const signalA = contentSignals?.get(a.pilotId);
  const signalB = contentSignals?.get(b.pilotId);
  if (signalA?.hashConteudo && signalB?.hashConteudo) {
    if (signalA.hashConteudo === signalB.hashConteudo) {
      return { ...base, classification: "DUPLICATE_EXACT", reason: "Hash do conteúdo extraído é idêntico." };
    }
    return {
      ...base,
      classification: "POSSIBLE_DUPLICATE",
      reason: "Hashes de conteúdo diferentes, mas mesmo duplicate_group do manifesto (título/referência semelhantes) — pode ser uma versão revisada, não uma cópia idêntica.",
    };
  }

  const titleA = normalizeText(a.title);
  const titleB = normalizeText(b.title);
  const refA = normalizeText(a.preliminaryReference);
  const refB = normalizeText(b.preliminaryReference);
  const sameTitle = titleA === titleB;
  const sameReference = refA !== "" && refA === refB;

  if (sameTitle || sameReference) {
    return {
      ...base,
      classification: "POSSIBLE_DUPLICATE",
      reason:
        `Mesmo duplicate_group (${duplicateGroup}) e ` +
        `${sameTitle ? "título" : ""}${sameTitle && sameReference ? " + " : ""}${sameReference ? "referência preliminar" : ""} ` +
        "iguais — conteúdo não comparado ainda (sem hash/texto extraído), então não é elevado a DUPLICATE_EXACT.",
    };
  }

  return {
    ...base,
    classification: "POSSIBLE_DUPLICATE",
    reason: `Mesmo duplicate_group (${duplicateGroup}) no manifesto, mas título e referência preliminar diferem — mantido como possível duplicado para revisão humana, nunca DISTINCT sem comparar o conteúdo real.`,
  };
}
