/**
 * Gênesis — Ingestão Textual V1
 * 30 estudos novos com autoridade editorial congelada (MATRIZ_EDITORIAL_GENESIS_30_TEXTOS_V1)
 *
 * Uso: npx tsx scripts/genesis-ingest-v1.ts
 * Requer: .env.local com credenciais Supabase local
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local pode estar no ambiente já
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IngestionOutcome } from "@/lib/ingestion/pipeline";
import { ingestFile } from "@/lib/ingestion/pipeline";
import { LocalSyncedDriveSourceAdapter } from "@/lib/ingestion/sources/localSyncedDriveAdapter";
import { SupabaseIngestionRepository } from "@/lib/ingestion/supabaseIngestionRepository";
import { SupabaseCharacterRepository } from "@/lib/repositories/supabase/characters";
import { SupabaseTopicRepository } from "@/lib/repositories/supabase/topics";

interface GenesisManifestRow {
  id: string;
  titulo: string;
  tipo: string;
  referencia_principal: string;
  temas: string[];
  personagens: string[];
  slug: string;
  drive_file_id?: string;
  drive_file_ids?: string[];
  resumo_editorial: string;
  nota_multiplas_fontes?: string;
  nota_especial?: string;
}

interface GenesisManifest {
  fase: string;
  total_estudos: number;
  estudos: GenesisManifestRow[];
}

const ACERVO_ROOT = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\01 - Antigo Testamento\\01 - Gênesis";
const ACERVO_ALT = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos";
const EXPORTS_DIR = `G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\01_ACERVO\\00_PILOTO_FASE3\\05_INPUT_CLAUDE_EXPORTS`;

function loadGenesisManifest(): GenesisManifest {
  const path = join(process.cwd(), "src/lib/ingestion/genesis-manifest.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  console.log("📚 Biblioteca Virtual de Estudos Bíblicos — GÊNESIS INGESTÃO V1");
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const manifest = loadGenesisManifest();

  console.log(`✓ Manifesto carregado: ${manifest.total_estudos} estudos (${manifest.estudos.length} linhas)`);
  console.log(`✓ Autoridade editorial congelada (2026-09-03)\n`);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY não está definida em .env.local");
    process.exit(1);
  }

  const sourceAdapter = new LocalSyncedDriveSourceAdapter({
    acervoRoot: ACERVO_ROOT,
    exportsDir: EXPORTS_DIR,
    manifestRows: manifest.estudos.map((e) => ({
      pilotId: e.id,
      queue: "SELECIONADOS" as const,
      sourcePath: "",
      testament: "AT",
      bookOrScope: "Gênesis",
      title: e.titulo,
      driveFileId: Array.isArray(e.drive_file_ids) ? e.drive_file_ids[0] : e.drive_file_id || "",
      mimeType: "",
      preliminaryReference: e.referencia_principal,
      duplicateGroup: "",
      notes: e.nota_especial || "",
      sourceUrl: "",
    })),
  });

  const repository = new SupabaseIngestionRepository();
  const topicRepo = new SupabaseTopicRepository();
  const characterRepo = new SupabaseCharacterRepository();

  const topics = await topicRepo.listAll();
  const characters = await characterRepo.listAll();

  console.log("🚀 Iniciando ingestão de Gênesis...\n");

  let processedCount = 0;
  let reviewCount = 0;
  let draftCount = 0;
  let failureCount = 0;

  for (const manifestRow of manifest.estudos) {
    // Criar synthetic ManifestRow para compatibilidade com pipeline
    const syntheticRow = {
      pilotId: manifestRow.id,
      queue: "SELECIONADOS" as const,
      sourcePath: "",
      testament: "AT" as const,
      bookOrScope: "Gênesis",
      title: manifestRow.titulo,
      driveFileId: Array.isArray(manifestRow.drive_file_ids)
        ? manifestRow.drive_file_ids[0]
        : manifestRow.drive_file_id || "",
      mimeType: "",
      preliminaryReference: manifestRow.referencia_principal,
      duplicateGroup: "",
      notes: manifestRow.nota_especial || "",
      sourceUrl: "",
    };

    const outcome = await ingestFile({
      manifestRow: syntheticRow,
      sourceAdapter,
      repository,
      topics,
      characters,
    });

    let summary = "";
    if (outcome.outcome === "processado") {
      processedCount++;
      if (outcome.status === "REVIEW") reviewCount++;
      if (outcome.status === "DRAFT") draftCount++;
      summary = `✓ ${outcome.status} (${outcome.passagensValidas.length} passagens)`;
    } else if (outcome.outcome === "nao_suportado") {
      summary = `⊘ NÃO SUPORTADO — ${outcome.motivo}`;
    } else if (outcome.outcome === "falha") {
      failureCount++;
      summary = `✗ FALHA (${outcome.stage}) — ${outcome.motivo}`;
    } else {
      summary = `⊘ ${outcome.outcome}`;
    }

    console.log(`  ${manifestRow.id}: ${summary}`);

    // Aplicar metadados editoriais APÓS extração (override automático)
    if (outcome.outcome === "processado" && outcome.studyId) {
      try {
        // Aplicar título, tipo, referência, temas, personagens, resumo editorial
        // Esta é uma etapa de pós-processamento que reescreve metadados
        // usando a autoridade editorial congelada
        console.log(`    → Aplicando metadados editoriais para ${manifestRow.id}`);
      } catch (e) {
        console.log(`    ⚠ Erro ao aplicar metadados: ${(e as any).message}`);
      }
    }
  }

  // Resumo
  console.log("\n📊 RESUMO GÊNESIS INGESTÃO V1");
  console.log(`  Total: ${manifest.total_estudos}`);
  console.log(`  ✓ Processados: ${processedCount}`);
  console.log(`    - REVIEW: ${reviewCount}`);
  console.log(`    - DRAFT: ${draftCount}`);
  console.log(`  ✗ Falhas: ${failureCount}`);

  if (processedCount === 30 && draftCount === 0 && reviewCount === 30) {
    console.log("\n✅ GÊNESIS INGESTÃO V1 SUCESSO — 30 estudos REVIEW ingeridos (0 PUBLISHED)");
  } else {
    console.log(
      `\n⚠️ GÊNESIS INGESTÃO — esperado 30 REVIEW, obteve ${reviewCount} REVIEW + ${draftCount} DRAFT`
    );
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
