/**
 * Correção: converter 3 DRAFT Genesis para REVIEW
 * GEN-009, GEN-021, GEN-030 falharam no detector mas têm referências nos títulos
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
);

async function main() {
  console.log("\n🔧 Corrigindo DRAFT Genesis → REVIEW\n");

  const studies = [
    { gen: "GEN-009", titulo: "Agar", referencia: "Gênesis 21:14–19" },
    { gen: "GEN-021", titulo: "Os Guerreiros de Abraão", referencia: "Gênesis 14:12–16" },
    { gen: "GEN-030", titulo: "E a Donzela Era Mui Formosa", referencia: "Gênesis 24:16" },
  ];

  for (const study of studies) {
    // Buscar slug da study
    const { data, error } = await supabase
      .from("studies")
      .select("id, slug, status")
      .eq("status", "DRAFT")
      .ilike("titulo", `%${study.titulo}%`)
      .single();

    if (error || !data) {
      console.log(`❌ ${study.gen}: não encontrada`);
      continue;
    }

    // Atualizar status para REVIEW
    const { error: updateError } = await supabase
      .from("studies")
      .update({ status: "REVIEW" })
      .eq("id", data.id);

    if (updateError) {
      console.log(`❌ ${study.gen}: erro ao atualizar — ${updateError.message}`);
    } else {
      console.log(`✓ ${study.gen}: convertido para REVIEW (referência: ${study.referencia})`);
    }
  }

  console.log("\n✅ Correção concluída\n");
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
