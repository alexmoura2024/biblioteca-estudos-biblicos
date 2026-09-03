/**
 * Ingestão especial para GEN-041: Obra como Forma de Vida
 * Arquivo: .doc mas conteúdo é RTF (formato legado Word 6.0/95)
 * Estratégia: tentar extração RTF via padrão diferente
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local pode estar no ambiente já
}

import { readFileSync } from "node:fs";
import { ingestFile } from "@/lib/ingestion/pipeline";
import { GenesisLocalSourceAdapter } from "@/lib/ingestion/sources/genesisLocalAdapter";
import { SupabaseIngestionRepository } from "@/lib/ingestion/supabaseIngestionRepository";
import { SupabaseCharacterRepository } from "@/lib/repositories/supabase/characters";
import { SupabaseTopicRepository } from "@/lib/repositories/supabase/topics";

const GENESIS_INPUT_DIR = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO";

async function main() {
  console.log("\n🔧 INGESTÃO ESPECIAL: GEN-041 (RTF/DOC Legado)\n");

  const genFile = `${GENESIS_INPUT_DIR}\\Gn 37 -  Obra Forma de Vida .doc`;

  try {
    const buffer = readFileSync(genFile);

    // Detectar se é RTF inspecionando primeiros bytes
    const header = buffer.toString("utf8", 0, 10);
    console.log(`  Arquivo: Gn 37 - Obra Forma de Vida .doc`);
    console.log(`  Tamanho: ${buffer.length} bytes`);
    console.log(`  Header: ${header.substring(0, 8)}`);

    if (header.includes("rtf")) {
      console.log(`  ⚠️  Detectado: formato RTF (não Word binary)\n`);
    } else if (header.includes("\xd0\xcf") || buffer[0] === 0xd0) {
      console.log(`  ⚠️  Detectado: formato OLE (Word 6.0/95)\n`);
    }
  } catch (e) {
    console.log(`  ❌ Erro ao ler arquivo: ${(e as any).message}`);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY não definida");
    process.exit(1);
  }

  const sourceAdapter = new GenesisLocalSourceAdapter(GENESIS_INPUT_DIR);
  sourceAdapter.registerFile("1n_FJooQw6YBO_8Z9pWUPl9vk3bSUzG_L", genFile);

  const repository = new SupabaseIngestionRepository();
  const topicRepo = new SupabaseTopicRepository();
  const characterRepo = new SupabaseCharacterRepository();

  const topics = await topicRepo.listAll();
  const characters = await characterRepo.listAll();

  const manifestRow = {
    pilotId: "GEN-041",
    queue: "SELECIONADOS" as const,
    sourcePath: "",
    testament: "AT" as const,
    bookOrScope: "Gênesis",
    title: "Obra como Forma de Vida",
    driveFileId: "1n_FJooQw6YBO_8Z9pWUPl9vk3bSUzG_L",
    mimeType: "application/msword", // Sugestão incorreta propositalmente
    preliminaryReference: "Gênesis 37",
    duplicateGroup: "",
    notes: "Arquivo RTF disfarçado de .doc",
    sourceUrl: "",
  };

  console.log("  Tentando ingestão...\n");

  const outcome = await ingestFile({
    manifestRow,
    sourceAdapter,
    repository,
    topics,
    characters,
  });

  if (outcome.outcome === "processado") {
    console.log(`  ✓ ${outcome.status} (${outcome.passagensValidas.length} passagens)`);
    console.log(`\n✅ GEN-041 ingerido com sucesso`);
    process.exit(0);
  } else if (outcome.outcome === "falha") {
    console.log(`  ✗ FALHA (${outcome.stage}) — ${outcome.motivo}`);
    console.log(`\n⚠️  GEN-041 não pode ser ingerido automaticamente`);
    console.log(`  Motivo: ${outcome.motivo}`);
    console.log(`\n  Próximas ações:`);
    console.log(`  1. Converter arquivo manualmente para DOCX/PDF`);
    console.log(`  2. Usar LibreOffice/Pandoc para converter RTF legado`);
    console.log(`  3. Copiar conteúdo manualmente se arquivo corrompido`);
    process.exit(1);
  } else {
    console.log(`  ⊘ ${outcome.outcome}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
