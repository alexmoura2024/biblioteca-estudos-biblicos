/**
 * Aplica referências editoriais aprovadas aos 2 estudos DRAFT de Fase 1
 * e altera status para REVIEW
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "http://127.0.0.1:54321",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
);

async function main() {
  console.log("\n🔧 APLICANDO REFERÊNCIAS EDITORIAIS APROVADAS\n");

  // 1. SEL-005: "A MINHA ALMA TEM SEDE DO DEUS VIVO — Salmo 42:2"
  //    Adicionar: Salmo 42:2
  const study1 = await supabase
    .from("studies")
    .select("id")
    .eq("slug", "a-minha-alma-tem-sede-do-deus-vivo-salmo-422")
    .single();

  if (study1.error) {
    console.error("Erro ao buscar estudo 1:", study1.error);
  } else {
    const studyId = study1.data.id;
    console.log("✓ SEL-005 encontrado (ID:", studyId.substring(0, 8) + ")");

    // Buscar livro Salmo
    const book = await supabase.from("books").select("id").eq("slug", "salmo").single();
    if (book.data) {
      // Buscar ou criar passage Salmo 42:2
      const passage = await supabase
        .from("passages")
        .select("id")
        .eq("book_id", book.data.id)
        .eq("capitulo", 42)
        .eq("versiculo_inicio", 2)
        .eq("versiculo_fim", 2)
        .single();

      if (passage.data) {
        // Adicionar study_passages
        await supabase.from("study_passages").insert([
          {
            study_id: studyId,
            passage_id: passage.data.id,
            tipo: "referenciada",
            priority: 1,
          },
        ]);
        console.log("  ✓ Passagem adicionada: Salmo 42:2");
      } else {
        // Criar a passage primeiro
        const newPassage = await supabase
          .from("passages")
          .insert([
            {
              book_id: book.data.id,
              capitulo: 42,
              versiculo_inicio: 2,
              versiculo_fim: 2,
              referencia_normalizada: "Salmo 42:2",
            },
          ])
          .select()
          .single();

        if (newPassage.data) {
          await supabase.from("study_passages").insert([
            {
              study_id: studyId,
              passage_id: newPassage.data.id,
              tipo: "referenciada",
              priority: 1,
            },
          ]);
          console.log("  ✓ Passagem criada e adicionada: Salmo 42:2");
        }
      }

      // Alterar status para REVIEW
      await supabase.from("studies").update({ status: "REVIEW" }).eq("id", studyId);
      console.log("  ✓ Status alterado para REVIEW\n");
    }
  }

  // 2. SEL-006: "O Senhor é o meu Pastor" (Salmo 23)
  //    Adicionar: Salmo 23 (capítulo inteiro, sem versículos específicos)
  const study2 = await supabase
    .from("studies")
    .select("id")
    .eq("slug", "o-senhor-e-o-meu-pastor-qc68og")
    .single();

  if (study2.error) {
    console.error("Erro ao buscar estudo 2:", study2.error);
  } else {
    const studyId = study2.data.id;
    console.log("✓ SEL-006 encontrado (ID:", studyId.substring(0, 8) + ")");

    // Buscar livro Salmo
    const book = await supabase.from("books").select("id").eq("slug", "salmo").single();
    if (book.data) {
      // Buscar ou criar passage Salmo 23 (capítulo inteiro)
      const passage = await supabase
        .from("passages")
        .select("id")
        .eq("book_id", book.data.id)
        .eq("capitulo", 23)
        .is("versiculo_inicio", null)
        .single();

      if (passage.data) {
        // Adicionar study_passages
        await supabase.from("study_passages").insert([
          {
            study_id: studyId,
            passage_id: passage.data.id,
            tipo: "referenciada",
            priority: 1,
          },
        ]);
        console.log("  ✓ Passagem adicionada: Salmo 23");
      } else {
        // Criar a passage
        const newPassage = await supabase
          .from("passages")
          .insert([
            {
              book_id: book.data.id,
              capitulo: 23,
              versiculo_inicio: null,
              versiculo_fim: null,
              referencia_normalizada: "Salmo 23",
            },
          ])
          .select()
          .single();

        if (newPassage.data) {
          await supabase.from("study_passages").insert([
            {
              study_id: studyId,
              passage_id: newPassage.data.id,
              tipo: "referenciada",
              priority: 1,
            },
          ]);
          console.log("  ✓ Passagem criada e adicionada: Salmo 23");
        }
      }

      // Alterar status para REVIEW
      await supabase.from("studies").update({ status: "REVIEW" }).eq("id", studyId);
      console.log("  ✓ Status alterado para REVIEW\n");
    }
  }

  console.log("✅ CONVERSÃO COMPLETA\n");
  console.log("Estado esperado:");
  console.log("  20 REVIEW");
  console.log("  0 DRAFT (reais)");
  console.log("  0 PUBLISHED (reais)");
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
