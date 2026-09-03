/**
 * Criar GEN-041 manualmente como REVIEW
 * Arquivo: RTF legado não suportado por word-extractor
 * Decisão: criar study com resumo editorial e status REVIEW
 * (Todos os 30 novos devem terminar REVIEW, não DRAFT)
 */

try {
  process.loadEnvFile(".env.local");
} catch {}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
);

async function main() {
  console.log("\n📝 Criando GEN-041 como DRAFT (arquivo RTF legado não extraível)\n");

  // Buscar referência Genesis 37 primeiro
  const { data: bookData } = await supabase.from("books").select("id").eq("slug", "genesis").single();

  if (!bookData) {
    console.error("❌ Livro Gênesis não encontrado");
    process.exit(1);
  }

  // Criar passage para Gênesis 37
  const { data: passageData, error: passageError } = await supabase
    .from("passages")
    .insert({
      book_id: bookData.id,
      capitulo: 37,
      referencia_normalizada: "Gênesis 37",
    })
    .select("id")
    .single();

  if (passageError) {
    console.error(`❌ Erro ao criar passage: ${passageError.message}`);
    process.exit(1);
  }

  // Criar study (apenas campos que existem na schema)
  const { data: studyData, error: studyError } = await supabase
    .from("studies")
    .insert({
      titulo: "Obra como Forma de Vida",
      slug: "obra-como-forma-de-vida-genesis-37",
      resumo: "Estudo sobre trabalho e vocação em Gênesis 37. Arquivo fonte em formato RTF legado não extraível por ferramentas padrão — conteúdo a ser recuperado manualmente em sessão de revisão editorial.",
      conteudo: "[Conteúdo não disponível na ingestão: arquivo RTF legado. Arquivo: Gn 37 - Obra Forma de Vida .doc (ID: 1n_FJooQw6YBO_8Z9pWUPl9vk3bSUzG_L). Formato detectado: RTF (header \\{\\rtf1). Não suportado por word-extractor v3.x.]",
      status: "REVIEW",
      visibilidade: "privado",
      autor: "[Ingestão automática — Genesis Textual V1]",
      data_origem: new Date().toISOString().split("T")[0],
      palavras_chave: ["Genesis", "Gênesis 37", "Trabalho", "Vocação"],
    })
    .select("id")
    .single();

  if (studyError) {
    console.error(`❌ Erro ao criar study: ${studyError.message}`);
    process.exit(1);
  }

  // Vincular passage (tipo MAIN)
  const { error: linkError } = await supabase.from("study_passages").insert({
    study_id: studyData.id,
    passage_id: passageData.id,
    tipo_relacao: "MAIN",
    prioridade: 1,
  });

  if (linkError) {
    console.error(`❌ Erro ao vincular passage: ${linkError.message}`);
    process.exit(1);
  }

  // Nota: não vamos criar file record separado — arquivo será vinculado em revisão
  // (O ID está registrado no conteúdo do study para referência editorial)

  console.log(`✓ GEN-041 criado como REVIEW`);
  console.log(`  ID: ${studyData.id}`);
  console.log(`  Slug: obra-como-forma-de-vida-genesis-37`);
  console.log(`  Status: REVIEW`);
  console.log(`  Diagnóstico: Arquivo RTF legado não extraível na ingestão`);
  console.log(`  Ação: Conteúdo a ser recuperado em revisão editorial\n`);

  console.log(`✅ Procedimento concluído`);
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
