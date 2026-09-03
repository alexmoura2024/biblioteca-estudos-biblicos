/**
 * Gênesis — Ingestão Textual V1
 * 30 estudos novos com autoridade editorial congelada (MATRIZ_EDITORIAL_GENESIS_30_TEXTOS_V1)
 * Fontes técnicas: G:\Meu Drive\...\06_EDITORIAL\04_BACKLOG_EDITORIAL\01_GENESIS\01_ARQUIVOS_DE_TEXTO (32 arquivos)
 *
 * Uso: npx tsx scripts/genesis-ingest-v1.ts
 * Requer: .env.local com credenciais Supabase local
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local pode estar no ambiente já
}

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ingestFile } from "@/lib/ingestion/pipeline";
import { GenesisLocalSourceAdapter } from "@/lib/ingestion/sources/genesisLocalAdapter";
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

// Pasta técnica com cópias dos 32 arquivos de Gênesis (32 → 30 estudos, GEN-013 com 3 fontes)
const GENESIS_INPUT_DIR = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO";

function loadGenesisManifest(): GenesisManifest {
  const path = join(process.cwd(), "src/lib/ingestion/genesis-manifest.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

// Mapeamento de títulos para GEN-IDs
function buildTitleToIdMap(): Map<string, string> {
  return new Map([
    ["A Criação do Homem", "GEN-001"],
    ["A Formação da Igreja", "GEN-002"],
    ["Pão e Vinho", "GEN-007"],
    ["Agar", "GEN-009"],
    ["Entra bendito do Senhor", "GEN-013"],
    ["Isaque e Rebeca", "GEN-014"],
    ["Labão", "GEN-015"],
    ["A constituição do lar", "GEN-016"],
    ["Fugindo para a vida", "GEN-017"],
    ["Escapa-te por tua vida", "GEN-018"],
    ["A Salvação de Ló", "GEN-019"],
    ["O Dízimo", "GEN-020"],
    ["Os Guerreiros de Abraão", "GEN-021"],
    ["Ló", "GEN-022"],
    ["A torre de Babel", "GEN-024"],
    ["O pacto de Deus com Noé", "GEN-025"],
    ["Concepção, Maturação e Nascimento da Igreja", "GEN-026"],
    ["Os dois filhos de José", "GEN-028"],
    ["E a donzela era mui formosa", "GEN-030"],
    ["Manassés E Efraim", "GEN-031"],
    ["A bênção de José", "GEN-032"],
    ["Declara-me qual o teu salário", "GEN-033"],
    ["Beija-me meu filho", "GEN-034"],
    ["A luta de Jacó", "GEN-035"],
    ["Eis aqui Raquel", "GEN-036"],
    ["A fome no Egito", "GEN-037"],
    ["E acabando o dinheiro", "GEN-038"],
    ["O Espírito Santo", "GEN-039"],
    ["Rebanhos de Jacó", "GEN-040"],
    ["Obra Forma de Vida", "GEN-041"],
  ]);
}

// Localizar arquivo físico da pasta técnica
// Estratégia: buscar por palavras principais do título
function findLocalFile(titulo: string): string | null {
  try {
    const files = readdirSync(GENESIS_INPUT_DIR, { encoding: "utf8" });

    // Extrair palavras principais do título (minúsculas, sem acentos)
    const normalize = (s: string) => s.toLowerCase().replace(/[àáâãäåèéêëìíîïòóôõöùúûüñ]/g, (c) => {
      const map: Record<string, string> = {
        à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a",
        è: "e", é: "e", ê: "e", ë: "e",
        ì: "i", í: "i", î: "i", ï: "i",
        ò: "o", ó: "o", ô: "o", õ: "o", ö: "o",
        ù: "u", ú: "u", û: "u", ü: "u",
        ñ: "n"
      };
      return map[c] || c;
    });

    const titleNorm = normalize(titulo);
    const titleWords = titleNorm.split(/\s+/).filter((w) => w.length > 2); // Palavras com 3+ letras

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const file of files) {
      const fileNorm = normalize(file);
      let score = 0;

      // Pontuação: quantas palavras da titulo estão no arquivo?
      for (const word of titleWords) {
        if (fileNorm.includes(word)) {
          score += 1;
        }
      }

      // Bônus: correspondência exata do substring
      if (fileNorm.includes(titleNorm)) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = file;
      }
    }

    if (bestMatch && bestScore > 0) {
      const fullPath = join(GENESIS_INPUT_DIR, bestMatch);
      statSync(fullPath); // Verificar acesso
      return fullPath;
    }
  } catch (e) {
    // Silencioso na busca
  }

  return null;
}

async function main() {
  console.log("📚 Biblioteca Virtual de Estudos Bíblicos — GÊNESIS INGESTÃO V1");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Input: ${GENESIS_INPUT_DIR}\n`);

  const manifest = loadGenesisManifest();

  console.log(`✓ Manifesto carregado: ${manifest.total_estudos} estudos`);
  console.log(`✓ Pasta técnica com 32 arquivos`);
  console.log(`✓ Autoridade editorial congelada (2026-09-03)\n`);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY não está definida em .env.local");
    process.exit(1);
  }

  const sourceAdapter = new GenesisLocalSourceAdapter(GENESIS_INPUT_DIR);
  const repository = new SupabaseIngestionRepository();
  const topicRepo = new SupabaseTopicRepository();
  const characterRepo = new SupabaseCharacterRepository();

  const topics = await topicRepo.listAll();
  const characters = await characterRepo.listAll();

  console.log("🚀 Iniciando ingestão de Gênesis...\n");

  // PRÉ-PROCESSAMENTO: Registrar todos os arquivos no adaptador
  console.log("  Pré-registrando arquivos locais...");
  let registeredCount = 0;
  for (const manifestRow of manifest.estudos) {
    const localPath = findLocalFile(manifestRow.titulo);
    if (localPath) {
      const driveFileId = Array.isArray(manifestRow.drive_file_ids)
        ? manifestRow.drive_file_ids[0]
        : manifestRow.drive_file_id || "";
      sourceAdapter.registerFile(driveFileId, localPath);
      registeredCount++;

      // Para GEN-013, registrar também os outros drive_file_ids
      if (Array.isArray(manifestRow.drive_file_ids) && manifestRow.drive_file_ids.length > 1) {
        // Os outros arquivos apontam para o mesmo resultado (deduplicação manual)
        for (let i = 1; i < manifestRow.drive_file_ids.length; i++) {
          sourceAdapter.registerFile(manifestRow.drive_file_ids[i], localPath);
        }
      }
    }
  }
  console.log(`  ✓ ${registeredCount}/${manifest.total_estudos} arquivos registrados\n`);

  let processedCount = 0;
  let reviewCount = 0;
  let draftCount = 0;
  let failureCount = 0;
  const processedIds = new Set<string>();

  for (const manifestRow of manifest.estudos) {
    // GEN-013 tem múltiplos drive_file_ids → ingerir só uma vez
    if (processedIds.has(manifestRow.id)) {
      console.log(`  ${manifestRow.id}: ⊘ SALTO (N:N já processado)`);
      continue;
    }

    // Criar ManifestRow para pipeline
    const driveFileId = Array.isArray(manifestRow.drive_file_ids)
      ? manifestRow.drive_file_ids[0]
      : manifestRow.drive_file_id || "";

    const syntheticRow = {
      pilotId: manifestRow.id,
      queue: "SELECIONADOS" as const,
      sourcePath: "",
      testament: "AT" as const,
      bookOrScope: "Gênesis",
      title: manifestRow.titulo,
      driveFileId,
      mimeType: "",
      preliminaryReference: manifestRow.referencia_principal,
      duplicateGroup: "",
      notes: manifestRow.nota_especial || "",
      sourceUrl: "",
    };

    // Ingerir via pipeline
    try {
      const outcome = await ingestFile({
        manifestRow: syntheticRow,
        sourceAdapter,
        repository,
        topics,
        characters,
      });

      if (outcome.outcome === "processado") {
        processedCount++;
        if (outcome.status === "REVIEW") reviewCount++;
        if (outcome.status === "DRAFT") draftCount++;
        console.log(`  ${manifestRow.id}: ✓ ${outcome.status} (${outcome.passagensValidas.length} passagens)`);
        processedIds.add(manifestRow.id);
      } else if (outcome.outcome === "falha") {
        console.log(`  ${manifestRow.id}: ✗ FALHA (${outcome.stage}) — ${outcome.motivo}`);
        failureCount++;
      } else {
        console.log(`  ${manifestRow.id}: ⊘ ${outcome.outcome} — ${outcome.motivo || ""}`);
        failureCount++;
      }
    } catch (e) {
      console.log(`  ${manifestRow.id}: ✗ FALHA (EXCEPTION) — ${(e as Error).message}`);
      failureCount++;
    }
  }

  // Resumo
  console.log("\n📊 RESUMO GÊNESIS INGESTÃO V1");
  console.log(`  Total definido: ${manifest.total_estudos}`);
  console.log(`  ✓ Processados: ${processedCount}`);
  console.log(`    - REVIEW: ${reviewCount}`);
  console.log(`    - DRAFT: ${draftCount}`);
  console.log(`  ✗ Falhas: ${failureCount}`);

  if (processedCount === 30 && draftCount === 0 && reviewCount === 30) {
    console.log("\n✅ GÊNESIS INGESTÃO V1 SUCESSO — 30 estudos REVIEW ingeridos (0 PUBLISHED)");
    process.exit(0);
  } else {
    console.log(
      `\n⚠️ GÊNESIS INGESTÃO — esperado 30 REVIEW, obteve ${reviewCount} REVIEW + ${draftCount} DRAFT`
    );
    process.exit(failureCount > 0 ? 1 : 0);
  }
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
