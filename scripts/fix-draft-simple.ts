/**
 * Versão simplificada: apenas altera o status de DRAFT para REVIEW
 * sem tentar lidar com passages (que já podem existir)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
);

async function main() {
  console.log("\n🔧 Alterando status de DRAFT para REVIEW (Fase 1)\n");

  // SEL-005 e SEL-006 têm referências óbvias no título
  const toConvert = [
    { slug: "a-minha-alma-tem-sede-do-deus-vivo-salmo-422", name: "SEL-005" },
    { slug: "o-senhor-e-o-meu-pastor-qc68og", name: "SEL-006" },
  ];

  for (const study of toConvert) {
    const { error } = await supabase
      .from("studies")
      .update({ status: "REVIEW" })
      .eq("slug", study.slug);

    if (error) {
      console.log(`❌ ${study.name}: ${error.message}`);
    } else {
      console.log(`✓ ${study.name}: Status alterado para REVIEW`);
    }
  }

  console.log("\n✅ Concluído\n");
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
