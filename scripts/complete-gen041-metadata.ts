/**
 * Completar metadados de GEN-041
 * Adicionar: source relation (study_files), tópicos, personagens
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  console.log("\n🔧 COMPLETANDO METADADOS GEN-041\n");

  const supabase = createClient(
    "http://127.0.0.1:54321",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
  );

  // Buscar GEN-041
  const { data: study } = await supabase
    .from("studies")
    .select("id")
    .eq("slug", "obra-como-forma-de-vida-genesis-37")
    .single();

  if (!study) {
    console.error("❌ Estudo não encontrado");
    process.exit(1);
  }

  const studyId = study.id;

  // 1. Adicionar source relation
  console.log("1️⃣ Adicionando estudo↔arquivo (study_files)...");
  const { error: fileError } = await supabase.from("study_files").insert({
    study_id: studyId,
    drive_file_id: "1n_FJooQw6YBO_8Z9pWUPl9vk3bSUzG_L",
    nome_arquivo: "Gn 37 - Obra Forma de Vida .doc",
    status_processamento: "PROCESSADO",
  });

  if (fileError) {
    console.log(`   ⚠ Aviso: ${fileError.message}`);
  } else {
    console.log(`   ✓ Source linkado`);
  }

  // 2. Adicionar tópicos (conforme matriz)
  const topicos = [
    "Trabalho e Vocação",
    "Providência de Deus",
    "Propósito Divino",
  ];

  console.log(`\n2️⃣ Adicionando ${topicos.length} tópicos...`);

  for (const nome of topicos) {
    // Buscar ou criar tópico
    let { data: topic } = await supabase
      .from("topics")
      .select("id")
      .eq("nome", nome)
      .single();

    if (!topic) {
      const slug = nome
        .toLowerCase()
        .replace(/ç/g, "c")
        .replace(/ã/g, "a")
        .replace(/\s+/g, "-");
      const { data: newTopic } = await supabase
        .from("topics")
        .insert({ nome, slug })
        .select("id")
        .single();
      topic = newTopic;
    }

    if (topic) {
      const { error } = await supabase.from("study_topics").insert({
        study_id: studyId,
        topic_id: topic.id,
        peso: 1,
      });
      if (!error) {
        console.log(`   ✓ Tópico: ${nome}`);
      }
    }
  }

  // 3. Adicionar personagens (conforme matriz)
  const personagens = ["José", "Jesus"];

  console.log(`\n3️⃣ Adicionando ${personagens.length} personagens...`);

  for (const nome of personagens) {
    // Buscar personagem
    const { data: character } = await supabase
      .from("characters")
      .select("id")
      .eq("nome", nome)
      .single();

    if (character) {
      const { error } = await supabase.from("study_characters").insert({
        study_id: studyId,
        character_id: character.id,
        peso: 1,
      });
      if (!error) {
        console.log(`   ✓ Personagem: ${nome}`);
      }
    }
  }

  console.log(`\n✅ Metadados completados para GEN-041\n`);
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
