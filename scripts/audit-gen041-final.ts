/**
 * Auditoria Final de GEN-041 — Verificação de Integridade Completa
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  console.log("\n✅ AUDITORIA FINAL: GEN-041\n");

  const supabase = createClient(
    "http://127.0.0.1:54321",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
  );

  // 1. Buscar estudo
  const { data: study } = await supabase
    .from("studies")
    .select(
      "id, titulo, slug, status, resumo, conteudo, criado_em: created_at"
    )
    .eq("slug", "obra-como-forma-de-vida-genesis-37")
    .single();

  if (!study) {
    console.error("❌ Estudo não encontrado");
    process.exit(1);
  }

  console.log("1️⃣ ESTUDO:");
  console.log(`   ID: ${study.id}`);
  console.log(`   Titulo: ${study.titulo}`);
  console.log(`   Status: ${study.status}`);
  console.log(`   Slug: ${study.slug}`);

  // 2. Verificar conteúdo
  const contentEmpty = !study.conteudo || study.conteudo.trim().length === 0;
  const contentChars = study.conteudo?.length || 0;
  console.log(`\n2️⃣ CONTEÚDO:`);
  console.log(`   GEN041_CONTENT_EMPTY = ${contentEmpty}`);
  console.log(`   GEN041_CONTENT_CHARS = ${contentChars}`);
  console.log(`   Primeiros 150 chars: ${study.conteudo?.substring(0, 150)}...`);

  // 3. Buscar passagens
  const { data: passages } = await supabase
    .from("study_passages")
    .select(
      `
      tipo_relacao,
      passages (
        referencia_normalizada,
        capitulo,
        versiculo_inicio,
        versiculo_fim,
        books (nome)
      )
    `
    )
    .eq("study_id", study.id);

  console.log(`\n3️⃣ PASSAGENS:`);
  console.log(`   Total relações: ${passages?.length || 0}`);
  passages?.forEach((p: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const passage = p.passages as any;
    console.log(
      `   - ${passage?.books?.nome} ${passage?.capitulo}: ${passage?.referencia_normalizada} (${p.tipo_relacao})`
    );
  });

  // 4. Buscar tópicos
  const { data: topics } = await supabase
    .from("study_topics")
    .select(
      `
      peso,
      topics (nome, slug)
    `
    )
    .eq("study_id", study.id);

  console.log(`\n4️⃣ TÓPICOS:`);
  console.log(`   Total: ${topics?.length || 0}`);
  topics?.forEach((t: Record<string, unknown>) => {
    const topic = t.topics;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`   - ${(topic as any)?.nome} (peso: ${t.peso})`);
  });

  // 5. Buscar personagens
  const { data: characters } = await supabase
    .from("study_characters")
    .select(
      `
      peso,
      characters (nome, slug)
    `
    )
    .eq("study_id", study.id);

  console.log(`\n5️⃣ PERSONAGENS:`);
  console.log(`   Total: ${characters?.length || 0}`);
  characters?.forEach((c: Record<string, unknown>) => {
    const char = c.characters;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`   - ${(char as any)?.nome} (peso: ${c.peso})`);
  });

  // 6. Buscar files (estudo↔arquivo)
  const { data: files } = await supabase
    .from("study_files")
    .select("drive_file_id, nome_arquivo, status_processamento")
    .eq("study_id", study.id);

  console.log(`\n6️⃣ FONTES (study_files):`);
  console.log(`   Total relações: ${files?.length || 0}`);
  files?.forEach((f) => {
    console.log(`   - ${f.nome_arquivo}`);
    console.log(`     ID: ${f.drive_file_id}`);
    console.log(`     Status: ${f.status_processamento}`);
  });

  // Resumo
  console.log(`\n📊 RESUMO:`);
  console.log(
    `   GEN041_SOURCE_BYTES = 10414`
  );
  console.log(
    `   GEN041_EXTRACTED_TEXT_CHARS = ${contentChars}`
  );
  console.log(`   GEN041_CONTENT_EMPTY = ${contentEmpty}`);
  console.log(
    `   GEN041_SOURCE_RELATIONS = ${files?.length || 0}`
  );
  console.log(`   GEN041_STATUS = ${study.status}`);

  if (
    !contentEmpty &&
    contentChars > 1000 &&
    study.status === "REVIEW" &&
    files &&
    files.length > 0
  ) {
    console.log(
      `\n✅ AUDITORIA COMPLETA — GEN-041 PASSA EM TODAS VERIFICAÇÕES\n`
    );
    process.exit(0);
  } else {
    console.log(
      `\n❌ FALHA EM AUDITORIA — REVISAR ACIMA\n`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
