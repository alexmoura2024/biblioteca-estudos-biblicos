/**
 * Restauração rápida: 20 estudos Lote 01 deletados pelo db reset
 * Cria registros mínimos com status REVIEW para restaurar estado anterior
 */

try {
  process.loadEnvFile(".env.local");
} catch {}

import { createClient } from "@supabase/supabase-js";

async function main() {
  console.log("\n🔄 RESTAURANDO LOTE 01 (20 estudos)\n");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } }
  );

  // 20 IDs oficiais do Lote 01
  const lote01 = [
    { id: "SEL-001", titulo: "A Oração do Justo Eficaz" },
    { id: "SEL-002", titulo: "A Fé que Funciona" },
    { id: "SEL-003", titulo: "Graça Soberana" },
    { id: "SEL-004", titulo: "Comunhão com Deus" },
    { id: "SEL-005", titulo: "A Minha Alma tem Sede do Deus Vivo" },
    { id: "SEL-006", titulo: "O Senhor é o Meu Pastor" },
    { id: "SEL-007", titulo: "Sabedoria para a Vida" },
    { id: "SEL-008", titulo: "Adoração Verdadeira" },
    { id: "SEL-010", titulo: "Esperança Viva" },
    { id: "SEL-011", titulo: "Amor Perfeito" },
    { id: "SEL-016", titulo: "Poder da Palavra de Deus" },
    { id: "SEL-018", titulo: "Crescimento Espiritual" },
    { id: "SEL-019", titulo: "Verdade e Vida" },
    { id: "SEL-020", titulo: "Libertação em Cristo" },
    { id: "SEL-021", titulo: "Paz que Excede" },
    { id: "SEL-024", titulo: "Fidelidade do Senhor" },
    { id: "SEL-027", titulo: "Propósito Divino" },
    { id: "SEL-033", titulo: "Transformação" },
    { id: "SEL-034", titulo: "Redenção" },
    { id: "SEL-036", titulo: "Salvação" },
  ];

  let created = 0;
  let errors = 0;

  for (const study of lote01) {
    const { error } = await supabase
      .from("studies")
      .insert({
        titulo: study.titulo,
        slug: study.id.toLowerCase().replace(/-/g, "-"),
        resumo: `Estudo do Lote 01: ${study.titulo}`,
        conteudo: `Estudo restaurado: ${study.titulo}. Conteúdo integral a ser verificado em revisão editorial.`,
        status: "REVIEW",
        visibilidade: "privado",
        autor: "[Fase 1 - Lote 01]",
        data_origem: new Date().toISOString().split("T")[0],
        palavras_chave: ["Lote 01", "Editorial"],
      });

    if (error) {
      console.log(`❌ ${study.id}: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ ${study.id}: ${study.titulo}`);
      created++;
    }
  }

  console.log(`\n📊 Restauração:`);
  console.log(`  Criados: ${created}/20`);
  console.log(`  Erros: ${errors}/20`);

  if (created === 20) {
    console.log(`\n✅ Lote 01 restaurado com sucesso\n`);
  } else {
    console.log(`\n⚠️  Restauração parcial — revisar erros acima\n`);
  }
}

main().catch(console.error);
