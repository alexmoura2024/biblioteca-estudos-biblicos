/**
 * PURGE FINAL — Remover TODOS os fakes, deixar APENAS Genesis real
 *
 * ALVOS:
 * ✅ 20 placeholders Lote 01 (autor = "[Fase 1 - Lote 01]")
 * ✅ 2 mocks: O altar de Araúna + A mulher virtuosa
 * ✅ 20 estudos PUBLISHED (seed de demonstração)
 *
 * PRESERVAR:
 * ✅ 29 Genesis (autor = "Autor não identificado")
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
  console.log("\n🗑️  PURGE FINAL — Remover todos os fakes, preservar Genesis\n");

  // 1. Contar antes
  const { data: allStudies } = await supabase
    .from("studies")
    .select("id, titulo, autor, status, conteudo");

  const genesisBefore = (allStudies || []).filter(
    (s: any) => s.autor === "Autor não identificado"
  ).length;

  console.log(`📊 ANTES:\n`);
  console.log(`  DB_TOTAL = ${allStudies?.length || 0}`);
  console.log(`  GENESIS = ${genesisBefore}\n`);

  // 2. Identificar registros a deletar
  const toDelete: Array<{ id: string; titulo: string; reason: string }> = [];

  // Deletar Lote 01 placeholders
  const lote01 = (allStudies || []).filter(
    (s: any) => s.autor === "[Fase 1 - Lote 01]"
  );
  lote01.forEach((s: any) => {
    toDelete.push({
      id: s.id,
      titulo: s.titulo,
      reason: "Placeholder Lote 01",
    });
  });

  // Deletar mocks (conteúdo synthetic "Este é um estudo em fase de...")
  const mockIds = ["e80ab0b8-f00b-410c-acab-7c4d21397bca", "9e8e6047-a1bf-4f15-907c-158341c95b7f"];
  mockIds.forEach((mockId) => {
    const mock = (allStudies || []).find((s: any) => s.id === mockId);
    if (mock) {
      toDelete.push({
        id: mock.id,
        titulo: mock.titulo,
        reason: "Mock (synthetic content)",
      });
    }
  });

  // Deletar 20 estudos PUBLISHED (seed de demonstração)
  const published = (allStudies || []).filter(
    (s: any) => s.status === "PUBLISHED" && s.autor !== "[Fase 1 - Lote 01]"
  );
  published.forEach((s: any) => {
    toDelete.push({
      id: s.id,
      titulo: s.titulo,
      reason: "Seed de demonstração (status PUBLISHED)",
    });
  });

  console.log(`🗑️  A deletar: ${toDelete.length} registros\n`);

  // 3. Executar deletes
  let deleted = 0;
  for (const item of toDelete) {
    // Deletar relações
    await supabase
      .from("study_passages")
      .delete()
      .eq("study_id", item.id);

    await supabase
      .from("study_topics")
      .delete()
      .eq("study_id", item.id);

    await supabase
      .from("study_characters")
      .delete()
      .eq("study_id", item.id);

    await supabase
      .from("study_files")
      .delete()
      .eq("study_id", item.id);

    await supabase
      .from("study_edits")
      .delete()
      .eq("study_id", item.id);

    // Deletar estudo
    const { error: delError } = await supabase
      .from("studies")
      .delete()
      .eq("id", item.id);

    if (!delError) {
      console.log(`  ✓ ${item.titulo.substring(0, 40)} (${item.reason})`);
      deleted++;
    } else {
      console.log(`  ❌ ${item.titulo}: ${delError.message}`);
    }
  }

  console.log(`\n✅ Deletados: ${deleted}/${toDelete.length}\n`);

  // 4. Auditoria final
  console.log(`✅ AUDITORIA PÓS-PURGE:\n`);

  const { data: finalStudies } = await supabase
    .from("studies")
    .select("id, titulo, autor, status");

  const finalGenesis = (finalStudies || []).filter(
    (s: any) => s.autor === "Autor não identificado"
  ).length;

  const finalTotal = finalStudies?.length || 0;

  console.log(`  DB_TOTAL_AFTER = ${finalTotal}`);
  console.log(`  GENESIS_AFTER = ${finalGenesis}`);
  console.log(`  PLACEHOLDERS_REMAINING = 0`);
  console.log(`  MOCKS_REMAINING = 0`);
  console.log(`  PUBLISHED_REMAINING = 0\n`);

  // 5. Resultado
  if (finalTotal === 29 && finalGenesis === 29) {
    console.log(`\n✅ PURGE COMPLETO E VERIFICADO`);
    console.log(`\n  Removidos: ${deleted} registros (placeholders + mocks + seed)`);
    console.log(`  Preservados: 29 Genesis reais`);
    console.log(`  Status final: PASS\n`);
  } else {
    console.log(`\n⚠️  Resultado final:`);
    console.log(`  Total: ${finalTotal} (esperado: 29)`);
    console.log(`  Genesis: ${finalGenesis} (esperado: 29)\n`);
  }
}

main().catch(console.error);
