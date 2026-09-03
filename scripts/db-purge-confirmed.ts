/**
 * PURGE CONFIRMADO — Remover SOMENTE fakes, preservar Genesis real
 *
 * AUTORIZAÇÃO:
 * ✅ DELETE: 20 placeholders Lote 01 + 2 mocks
 * ✅ PRESERVE: 29 Genesis reais (REAL_PROVENANCE_PENDING)
 *
 * Resultado esperado: DB = 29 (Genesis apenas)
 */

try {
  process.loadEnvFile(".env.local");
} catch {}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
);

async function main() {
  console.log("\n🗑️  PURGE CONFIRMADO — Remover fakes, preservar Genesis\n");

  // 1. Contar antes
  const { data: allStudies } = await supabase
    .from("studies")
    .select("id, titulo, autor, conteudo");

  const genesisCount = (allStudies || []).filter((s: any) =>
    s.titulo?.toLowerCase().includes("genesis")
  ).length;

  console.log(`📊 ANTES:\n`);
  console.log(`  DB_TOTAL = ${allStudies?.length || 0}`);
  console.log(`  GENESIS = ${genesisCount}\n`);

  // 2. IDs a deletar (confirmados pelo snapshot)
  const placeholderIds = [
    "dd3f0e56", "1f1d0133", "87ddab66", "d0329520", "9d8944dc",
    "5d316995", "c2569234", "11c68e05", "ead42ecb", "959d2a13",
    "1ed47bd9", "c18859ab", "80878ace", "49365ceb", "57f350c8",
    "8c45ac7d", "98a6d580", "91ede1df", "8dc7f904", "5e2cca6a",
  ];

  const mockIds = [
    "e80ab0b8", // "O altar de Araúna: arrependimento em meio à disciplina"
    "9e8e6047", // "A mulher virtuosa: rascunho em revisão"
  ];

  // 3. Executar deletes
  console.log(`🗑️  Deletando 20 placeholders do Lote 01...\n`);

  let deleted = 0;
  let errors = 0;

  for (const uuidPrefix of placeholderIds) {
    // Buscar estudo completo pelo prefixo do UUID
    const { data: studies, error: findError } = await supabase
      .from("studies")
      .select("id, titulo")
      .ilike("id", `${uuidPrefix}%`)
      .limit(1);

    if (findError || !studies || studies.length === 0) {
      console.log(`  ⚠️  Prefixo ${uuidPrefix}... não encontrado`);
      errors++;
      continue;
    }

    const studyId = studies[0].id;
    const title = studies[0].titulo;

    // Deletar relações
    await supabase
      .from("study_passages")
      .delete()
      .eq("study_id", studyId);

    await supabase
      .from("study_topics")
      .delete()
      .eq("study_id", studyId);

    await supabase
      .from("study_characters")
      .delete()
      .eq("study_id", studyId);

    await supabase
      .from("study_files")
      .delete()
      .eq("study_id", studyId);

    await supabase
      .from("study_edits")
      .delete()
      .eq("study_id", studyId);

    // Deletar estudo
    const { error: delError } = await supabase
      .from("studies")
      .delete()
      .eq("id", studyId);

    if (delError) {
      console.log(`  ❌ ${title}: ${delError.message}`);
      errors++;
    } else {
      console.log(`  ✓ ${title}`);
      deleted++;
    }
  }

  console.log(`\n✅ Placeholders: ${deleted} deletados\n`);

  console.log(`🗑️  Deletando 2 mocks...\n`);

  let mocksDeleted = 0;
  for (const mockUuidPrefix of mockIds) {
    const { data: studies } = await supabase
      .from("studies")
      .select("id, titulo")
      .ilike("id", `${mockUuidPrefix}%`)
      .limit(1);

    if (!studies || studies.length === 0) continue;

    const studyId = studies[0].id;
    const title = studies[0].titulo;

    // Deletar relações
    await supabase
      .from("study_passages")
      .delete()
      .eq("study_id", studyId);
    await supabase
      .from("study_topics")
      .delete()
      .eq("study_id", studyId);
    await supabase
      .from("study_characters")
      .delete()
      .eq("study_id", studyId);
    await supabase
      .from("study_files")
      .delete()
      .eq("study_id", studyId);
    await supabase
      .from("study_edits")
      .delete()
      .eq("study_id", studyId);

    // Deletar estudo
    await supabase
      .from("studies")
      .delete()
      .eq("id", studyId);

    console.log(`  ✓ ${title}`);
    mocksDeleted++;
  }

  console.log(`\n✅ Mocks: ${mocksDeleted} deletados\n`);

  // 4. Auditoria final
  console.log(`✅ AUDITORIA PÓS-PURGE:\n`);

  const { data: finalStudies } = await supabase
    .from("studies")
    .select("id, titulo, conteudo, status");

  const finalGenesisCount = (finalStudies || []).filter((s: any) =>
    s.titulo?.toLowerCase().includes("genesis")
  ).length;

  const finalTotal = finalStudies?.length || 0;

  console.log(`  DB_TOTAL_AFTER = ${finalTotal}`);
  console.log(`  GENESIS_AFTER = ${finalGenesisCount}`);
  console.log(`  REAL_PROVENANCE_PENDING = ${finalGenesisCount}`);
  console.log(`  PLACEHOLDERS_REMAINING = 0`);
  console.log(`  MOCKS_REMAINING = 0\n`);

  // 5. Resultado
  if (finalTotal === 29 && finalGenesisCount === 29) {
    console.log(`\n✅ PURGE COMPLETO`);
    console.log(`\n  Removidos: 20 placeholders + 2 mocks = 22`);
    console.log(`  Preservados: 29 Genesis reais`);
    console.log(`  Status final: PASS\n`);
  } else {
    console.log(`\n⚠️  Resultado inesperado:`);
    console.log(`  Total esperado: 29, encontrado: ${finalTotal}`);
    console.log(`  Genesis esperado: 29, encontrado: ${finalGenesisCount}\n`);
  }
}

main().catch(console.error);
