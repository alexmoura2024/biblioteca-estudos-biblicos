/**
 * Fase 1 — ingestão do Lote 01 textual (20 estudos) contra o Supabase local.
 *
 * Filtra automaticamente:
 * - SELECIONADOS apenas (ignora REVISAR e DUPLICADOS_POSSIVEIS)
 * - Exclui media (SEL-012, SEL-029, SEL-032)
 * - Exclui fragmento (SEL-037)
 * - Exclui Gênesis (SEL-001 a 004) — para fase posterior
 * - Processa 20 estudos textuais (SEL-005 até SEL-025)
 *
 * Uso: npx tsx scripts/fase1-ingest.ts
 * Requer: .env.local com credenciais Supabase local
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local pode estar no ambiente já
}

import { loadManifest, rowsToIngest, validateManifest } from "../src/lib/ingestion/manifest";
import { ingestFile, type IngestionOutcome } from "../src/lib/ingestion/pipeline";
import { LocalSyncedDriveSourceAdapter } from "../src/lib/ingestion/sources/localSyncedDriveAdapter";
import { SupabaseIngestionRepository } from "../src/lib/ingestion/supabaseIngestionRepository";
import { SupabaseCharacterRepository } from "../src/lib/repositories/supabase/characters";
import { SupabaseTopicRepository } from "../src/lib/repositories/supabase/topics";
import fase1Config from "../src/lib/ingestion/fase1-manifest.json";

const ACERVO_ROOT = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\01_ACERVO";
const EXPORTS_DIR = `${ACERVO_ROOT}\\00_PILOTO_FASE3\\05_INPUT_CLAUDE_EXPORTS`;

const FASE1_ESTUDOS = new Set(fase1Config.estudos);

interface RunResult {
  pilotId: string;
  outcome: IngestionOutcome;
}

async function runBatch(
  rows: ReturnType<typeof loadManifest>,
  sourceAdapter: LocalSyncedDriveSourceAdapter,
  repository: SupabaseIngestionRepository,
  topics: Awaited<ReturnType<SupabaseTopicRepository["listAll"]>>,
  characters: Awaited<ReturnType<SupabaseCharacterRepository["listAll"]>>
): Promise<RunResult[]> {
  const results: RunResult[] = [];

  // Filter to FASE1_ESTUDOS only
  const fase1Rows = rows.filter((row) => FASE1_ESTUDOS.has(row.pilotId));

  console.log(`\n🔄 FASE 1 INGESTÃO — ${fase1Rows.length} estudos textuais`);
  console.log(`Excludes: SEL-012/029/032/037 (media/admin), SEL-001-004 (Gênesis para Fase posterior)`);
  console.log(`Target: 20 estudos textuais (SEL-005 até SEL-025)\n`);

  for (const row of fase1Rows) {
    const outcome = await ingestFile({ manifestRow: row, sourceAdapter, repository, topics, characters });
    results.push({ pilotId: row.pilotId, outcome });

    const summary =
      outcome.outcome === "processado"
        ? `PROCESSADO (${outcome.status}, ${outcome.passagensValidas.length} passagem(ns)${outcome.divergencias.length > 0 ? `, DIVERGÊNCIAS: ${outcome.divergencias.length}` : ""})`
        : outcome.outcome === "nao_suportado"
          ? `NÃO SUPORTADO — ${outcome.motivo}`
          : outcome.outcome === "ignorado_divisao_manual"
            ? `IGNORADO (divisão manual — DEC-042)`
            : `FALHA (${outcome.stage}) — ${outcome.motivo}`;

    console.log(`  ${row.pilotId}: ${summary}`);
  }

  return results;
}

async function main() {
  console.log("📚 Biblioteca Virtual de Estudos Bíblicos — FASE 1 INGESTÃO");
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const manifestRows = loadManifest();
  const validation = validateManifest(manifestRows);

  if (!validation.ok) {
    console.error("❌ Manifesto inválido:");
    validation.issues.forEach((issue) => console.error(`  - ${issue.message}`));
    process.exit(1);
  }

  const selectedRows = rowsToIngest(manifestRows, validation);

  console.log(`✓ Manifesto validado: ${selectedRows.length} candidatos (SELECIONADOS)`);
  console.log(`✓ Aliases resolvidos: ${Object.keys(validation.aliases).length}\n`);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY não está definida em .env.local");
    process.exit(1);
  }

  const sourceAdapter = new LocalSyncedDriveSourceAdapter({
    acervoRoot: ACERVO_ROOT,
    exportsDir: EXPORTS_DIR,
    manifestRows: selectedRows,
  });
  const repository = new SupabaseIngestionRepository();
  const topicRepo = new SupabaseTopicRepository();
  const characterRepo = new SupabaseCharacterRepository();

  const topics = await topicRepo.listAll();
  const characters = await characterRepo.listAll();

  console.log("🚀 Iniciando ingestão de Fase 1...\n");

  const results = await runBatch(selectedRows, sourceAdapter, repository, topics, characters);

  // Summary
  const summary = {
    total: results.length,
    processado: results.filter((r) => r.outcome.outcome === "processado").length,
    draft: results.filter((r) => r.outcome.outcome === "processado" && r.outcome.status === "DRAFT").length,
    review: results.filter((r) => r.outcome.outcome === "processado" && r.outcome.status === "REVIEW").length,
    nao_suportado: results.filter((r) => r.outcome.outcome === "nao_suportado").length,
    falha: results.filter((r) => r.outcome.outcome === "falha").length,
    ignorado_divisao: results.filter((r) => r.outcome.outcome === "ignorado_divisao_manual").length,
  };

  console.log("\n📊 RESUMO FASE 1 INGESTÃO");
  console.log(`  Total: ${summary.total}`);
  console.log(`  ✓ Processados: ${summary.processado} (${summary.review} REVIEW + ${summary.draft} DRAFT)`);
  console.log(`  ⊘ Não suportados: ${summary.nao_suportado}`);
  console.log(`  ✗ Falhas: ${summary.falha}`);
  console.log(`  ⊘ Ignorados (divisão manual): ${summary.ignorado_divisao}`);

  if (summary.processado === 20 && summary.draft + summary.review === 20) {
    console.log("\n✅ FASE 1 INGESTÃO SUCESSO — 20 estudos textuais ingeridos (0 PUBLISHED)");
  } else {
    console.log(
      `\n⚠️ FASE 1 INGESTÃO — esperado 20 processados, obteve ${summary.processado}`
    );
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
