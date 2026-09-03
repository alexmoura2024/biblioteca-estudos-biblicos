/**
 * Fase 3 — ingestão real do lote piloto contra o Supabase local, usando
 * o Google Drive já sincronizado no Windows (LocalSyncedDriveSourceAdapter
 * — decisão do usuário, sem credenciais de Drive API).
 *
 * Uso: npx tsx scripts/fase3-ingest-piloto.ts
 * Requer: .env.local com NEXT_PUBLIC_SUPABASE_URL/ANON_KEY e
 * SUPABASE_SERVICE_ROLE_KEY apontando para o Supabase local já resetado
 * (npx supabase db reset) com as migrations da Fase 3 aplicadas.
 *
 * NUNCA publica nada sozinho — `ingestFile` só cria DRAFT/REVIEW (ver
 * repository.ts, UpsertStudyInput.status). Idempotente: pode ser
 * rodado de novo com segurança (prova de idempotência real, não só de
 * teste unitário).
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local pode já estar carregado pelo ambiente — não é fatal.
}

import { loadManifest, rowsToIngest, validateManifest } from "../src/lib/ingestion/manifest";
import { ingestFile, type IngestionOutcome } from "../src/lib/ingestion/pipeline";
import { LocalSyncedDriveSourceAdapter } from "../src/lib/ingestion/sources/localSyncedDriveAdapter";
import { SupabaseIngestionRepository } from "../src/lib/ingestion/supabaseIngestionRepository";
import { SupabaseCharacterRepository } from "../src/lib/repositories/supabase/characters";
import { SupabaseTopicRepository } from "../src/lib/repositories/supabase/topics";

const ACERVO_ROOT = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\01_ACERVO";
const EXPORTS_DIR = `${ACERVO_ROOT}\\00_PILOTO_FASE3\\05_INPUT_CLAUDE_EXPORTS`;

interface RunResult {
  pilotId: string;
  outcome: IngestionOutcome;
}

async function runBatch(rows: ReturnType<typeof loadManifest>, sourceAdapter: LocalSyncedDriveSourceAdapter, repository: SupabaseIngestionRepository, topics: Awaited<ReturnType<SupabaseTopicRepository["listAll"]>>, characters: Awaited<ReturnType<SupabaseCharacterRepository["listAll"]>>): Promise<RunResult[]> {
  const results: RunResult[] = [];
  for (const row of rows) {
    const outcome = await ingestFile({ manifestRow: row, sourceAdapter, repository, topics, characters });
    results.push({ pilotId: row.pilotId, outcome });
    const summary =
      outcome.outcome === "processado"
        ? `PROCESSADO (${outcome.status}, ${outcome.passagensValidas.length} passagem(ns) válida(s)${outcome.divergencias.length > 0 ? `, DIVERGÊNCIA(S): ${outcome.divergencias.length}` : ""})`
        : outcome.outcome === "nao_suportado"
          ? `NÃO SUPORTADO — ${outcome.motivo}`
          : outcome.outcome === "ignorado_divisao_manual"
            ? `IGNORADO (dividido manualmente por decisão editorial humana — DEC-042)`
            : `FALHA (${outcome.stage}) — ${outcome.motivo}`;
    console.log(`${row.pilotId}: ${summary}`);
    if (outcome.outcome === "processado") {
      for (const divergencia of outcome.divergencias) console.log(`  ⚠ ${divergencia}`);
    }
  }
  return results;
}

function summarize(results: RunResult[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of results) {
    const key = r.outcome.outcome === "processado" ? `processado_${r.outcome.status}` : r.outcome.outcome;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function main() {
  console.log("=== Fase 3 — ingestão do piloto (execução 1) ===\n");

  const manifest = loadManifest();
  const validation = validateManifest(manifest);
  console.log(`Manifesto: ${validation.totalRows} linhas, ${validation.physicalSourceCount} fontes físicas únicas, ${validation.aliases.length} alias(es).`);
  for (const alias of validation.aliases) {
    console.log(`  alias: ${alias.aliasPilotId} -> ${alias.canonicalPilotId} (drive_file_id ${alias.driveFileId})`);
  }
  if (!validation.ok) {
    console.error("\nManifesto com erro(s) — abortando ingestão:");
    for (const issue of validation.issues) console.error(`  [${issue.severity}] ${issue.code}: ${issue.message}`);
    process.exit(1);
  }

  const toIngest = rowsToIngest(manifest, validation);
  console.log(`${toIngest.length} linhas serão processadas (aliases excluídos do lote).\n`);

  const topics = await new SupabaseTopicRepository().listAll();
  const characters = await new SupabaseCharacterRepository().listAll();
  console.log(`Catálogo carregado do banco: ${topics.length} temas, ${characters.length} personagens.\n`);

  const sourceAdapter = new LocalSyncedDriveSourceAdapter({ acervoRoot: ACERVO_ROOT, exportsDir: EXPORTS_DIR, manifestRows: manifest });
  const repository = new SupabaseIngestionRepository();

  console.log("--- Execução 1 ---");
  const firstRun = await runBatch(toIngest, sourceAdapter, repository, topics, characters);
  console.log("\nResumo execução 1:", JSON.stringify(summarize(firstRun), null, 2));

  console.log("\n--- Execução 2 (prova de idempotência) ---");
  const secondRun = await runBatch(toIngest, sourceAdapter, repository, topics, characters);
  console.log("\nResumo execução 2:", JSON.stringify(summarize(secondRun), null, 2));

  const studyIdsRun1 = new Set(firstRun.filter((r) => r.outcome.outcome === "processado").map((r) => (r.outcome as { studyId: string }).studyId));
  const studyIdsRun2 = new Set(secondRun.filter((r) => r.outcome.outcome === "processado").map((r) => (r.outcome as { studyId: string }).studyId));
  const sameStudyIds = studyIdsRun1.size === studyIdsRun2.size && [...studyIdsRun1].every((id) => studyIdsRun2.has(id));
  console.log(`\nIdempotência: execução 1 criou ${studyIdsRun1.size} studies, execução 2 reusou os MESMOS ids? ${sameStudyIds ? "SIM" : "NÃO — INVESTIGAR"}`);
}

main().catch((error) => {
  console.error("Erro fatal na ingestão:", error);
  process.exit(1);
});
