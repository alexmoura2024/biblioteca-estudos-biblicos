/**
 * Auditoria: Quantos estudos têm conteúdo integral vs apenas metadados
 */

try {
  process.loadEnvFile(".env.local");
} catch {}

import { createClient } from "@supabase/supabase-js";

async function main() {
  console.log("\n📊 AUDITORIA: Conteúdo Integral vs Metadados\n");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );

  // Buscar todos os estudos
  const { data: allStudies } = await supabase
    .from("studies")
    .select("id, titulo, status, conteudo");

  if (!allStudies) {
    console.error("❌ Erro ao buscar estudos");
    process.exit(1);
  }

  // Estatísticas
  const withContent = allStudies.filter(
    (s) => s.conteudo && s.conteudo.trim().length > 100
  );
  const withoutContent = allStudies.filter(
    (s) => !s.conteudo || s.conteudo.trim().length <= 100
  );

  const byStatus = {
    PUBLISHED: allStudies.filter((s) => s.status === "PUBLISHED").length,
    REVIEW: allStudies.filter((s) => s.status === "REVIEW").length,
    DRAFT: allStudies.filter((s) => s.status === "DRAFT").length,
  };

  console.log("Resumo Geral:");
  console.log(`  TOTAL_REAL_STUDIES = ${allStudies.length}`);
  console.log(`  WITH_FULL_CONTENT = ${withContent.length}`);
  console.log(`  WITHOUT_FULL_CONTENT = ${withoutContent.length}`);
  console.log(`\nPor Status:`);
  console.log(`  REVIEW = ${byStatus.REVIEW}`);
  console.log(`  DRAFT = ${byStatus.DRAFT}`);
  console.log(`  PUBLISHED_REAL = ${byStatus.PUBLISHED}\n`);

  // Listar estudos sem conteúdo
  if (withoutContent.length > 0) {
    console.log("⚠️  Estudos SEM conteúdo integral:");
    withoutContent.forEach((s) => {
      console.log(
        `  • ${s.titulo} (${s.status}) — ${s.conteudo?.length || 0} chars`
      );
    });
  } else {
    console.log("✓ Todos os estudos têm conteúdo integral!\n");
  }

  console.log(`\n✅ Auditoria concluída`);
}

main().catch(console.error);
