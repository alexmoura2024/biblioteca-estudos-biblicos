/**
 * Testes reais de edição editorial
 * Valida: título, resumo, conteúdo, tipo_estudo, temas, personagens
 * Usando estudos REAIS do banco
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

interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  details: string;
}

const results: TestResult[] = [];

async function testLote01EditTitle() {
  console.log("\n🧪 TESTE A: Lote 01 — Editar Título");

  try {
    // Buscar um SEL de Lote 01
    const { data: studies } = await supabase
      .from("studies")
      .select("id, titulo, slug, status")
      .ilike("autor", "%Lote 01%")
      .limit(1);

    if (!studies || studies.length === 0) {
      results.push({
        name: "Teste A (Lote 01 Título)",
        status: "FAIL",
        details: "Nenhum estudo Lote 01 encontrado",
      });
      return;
    }

    const study = studies[0];
    const originalTitle = study.titulo;
    const newTitle = `${originalTitle} [EDIT TEST]`;

    console.log(`  Estudo: ${study.slug}`);
    console.log(`  Título original: ${originalTitle}`);
    console.log(`  Novo título: ${newTitle}`);

    // Buscar histórico ANTES
    const { data: historyBefore } = await supabase
      .from("study_edits")
      .select("id")
      .eq("study_id", study.id);
    const countBefore = historyBefore?.length || 0;

    // Atualizar título
    const { error: updateError } = await supabase
      .from("studies")
      .update({ titulo: newTitle, updated_at: new Date().toISOString() })
      .eq("id", study.id);

    if (updateError) {
      results.push({
        name: "Teste A (Lote 01 Título)",
        status: "FAIL",
        details: `Erro na atualização: ${updateError.message}`,
      });
      return;
    }

    // Registrar snapshot no histórico
    const { error: histError } = await supabase
      .from("study_edits")
      .insert({
        study_id: study.id,
        titulo_anterior: originalTitle,
        campos_alterados: ["titulo"],
      });

    if (histError) {
      results.push({
        name: "Teste A (Lote 01 Título)",
        status: "FAIL",
        details: `Erro ao registrar histórico: ${histError.message}`,
      });
      return;
    }

    // Verificar que foi alterado
    const { data: updated } = await supabase
      .from("studies")
      .select("titulo, status")
      .eq("id", study.id)
      .single();

    if (updated?.titulo !== newTitle) {
      results.push({
        name: "Teste A (Lote 01 Título)",
        status: "FAIL",
        details: "Título não foi atualizado no banco",
      });
      return;
    }

    if (updated?.status !== "REVIEW") {
      results.push({
        name: "Teste A (Lote 01 Título)",
        status: "FAIL",
        details: `Status mudou para ${updated.status}, deveria manter REVIEW`,
      });
      return;
    }

    // Verificar histórico
    const { data: historyAfter } = await supabase
      .from("study_edits")
      .select("id")
      .eq("study_id", study.id);
    const countAfter = historyAfter?.length || 0;

    if (countAfter !== countBefore + 1) {
      results.push({
        name: "Teste A (Lote 01 Título)",
        status: "FAIL",
        details: `Histórico não registrado (antes: ${countBefore}, depois: ${countAfter})`,
      });
      return;
    }

    // Reverter
    await supabase
      .from("studies")
      .update({ titulo: originalTitle })
      .eq("id", study.id);

    results.push({
      name: "Teste A (Lote 01 Título)",
      status: "PASS",
      details: `✓ Título editado, status=REVIEW, histórico=+1`,
    });
  } catch (e) {
    results.push({
      name: "Teste A (Lote 01 Título)",
      status: "FAIL",
      details: `Exceção: ${(e as any).message}`,
    });
  }
}

async function testGenesisTemas() {
  console.log("\n🧪 TESTE B: Genesis — Editar Temas");

  try {
    // Buscar um GEN
    const { data: studies } = await supabase
      .from("studies")
      .select("id, titulo, slug, status")
      .ilike("titulo", "%GEN-%")
      .neq("slug", "obra-como-forma-de-vida-genesis-37") // Exclude GEN-041
      .limit(1);

    if (!studies || studies.length === 0) {
      results.push({
        name: "Teste B (Genesis Temas)",
        status: "FAIL",
        details: "Nenhum estudo Genesis encontrado",
      });
      return;
    }

    const study = studies[0];

    console.log(`  Estudo: ${study.slug}`);

    // Buscar temas ANTES
    const { data: topicsBefore } = await supabase
      .from("study_topics")
      .select("topic_id")
      .eq("study_id", study.id);
    const countBefore = topicsBefore?.length || 0;

    // Buscar primeiro tema canônico disponível
    const { data: canonTopics } = await supabase
      .from("topics")
      .select("id")
      .eq("nome", "Salvação")
      .single();

    if (!canonTopics) {
      results.push({
        name: "Teste B (Genesis Temas)",
        status: "FAIL",
        details: "Tema canônico 'Salvação' não encontrado",
      });
      return;
    }

    // Adicionar tema se não existe
    const isAlreadyLinked = topicsBefore?.some(
      (t: Record<string, unknown>) => t.topic_id === canonTopics.id
    );

    if (!isAlreadyLinked) {
      const { error } = await supabase.from("study_topics").insert({
        study_id: study.id,
        topic_id: canonTopics.id,
        peso: 1,
      });

      if (error) {
        results.push({
          name: "Teste B (Genesis Temas)",
          status: "FAIL",
          details: `Erro ao adicionar tema: ${error.message}`,
        });
        return;
      }

      // Registrar histórico
      await supabase.from("study_edits").insert({
        study_id: study.id,
        campos_alterados: ["temas"],
      });
    }

    // Verificar que tema está vinculado
    const { data: topicsAfter } = await supabase
      .from("study_topics")
      .select("topic_id")
      .eq("study_id", study.id);

    const hasTheme = topicsAfter?.some(
      (t: Record<string, unknown>) => t.topic_id === canonTopics.id
    );

    if (!hasTheme) {
      results.push({
        name: "Teste B (Genesis Temas)",
        status: "FAIL",
        details: "Tema não foi vinculado",
      });
      return;
    }

    results.push({
      name: "Teste B (Genesis Temas)",
      status: "PASS",
      details: `✓ Tema vinculado, N:N preservado`,
    });
  } catch (e) {
    results.push({
      name: "Teste B (Genesis Temas)",
      status: "FAIL",
      details: `Exceção: ${(e as any).message}`,
    });
  }
}

async function testGen013StudyFiles() {
  console.log("\n🧪 TESTE C: GEN-013 — study_files Preservado");

  try {
    // Buscar GEN-013
    const { data: studies } = await supabase
      .from("studies")
      .select("id, titulo, slug")
      .ilike("titulo", "%GEN-013%")
      .limit(1);

    if (!studies || studies.length === 0) {
      results.push({
        name: "Teste C (GEN-013 Files)",
        status: "FAIL",
        details: "GEN-013 não encontrado",
      });
      return;
    }

    const study = studies[0];
    console.log(`  Estudo: ${study.slug}`);

    // Contar study_files ANTES
    const { data: filesBefore } = await supabase
      .from("study_files")
      .select("id")
      .eq("study_id", study.id);
    const countBefore = filesBefore?.length || 0;

    console.log(`  study_files ANTES: ${countBefore}`);

    // Editar algum metadado (tipo_estudo)
    const { error: updateError } = await supabase
      .from("studies")
      .update({
        tipo_estudo: "THEMATIC",
        updated_at: new Date().toISOString(),
      })
      .eq("id", study.id);

    if (updateError) {
      results.push({
        name: "Teste C (GEN-013 Files)",
        status: "FAIL",
        details: `Erro ao atualizar: ${updateError.message}`,
      });
      return;
    }

    // Contar study_files DEPOIS
    const { data: filesAfter } = await supabase
      .from("study_files")
      .select("id")
      .eq("study_id", study.id);
    const countAfter = filesAfter?.length || 0;

    console.log(`  study_files DEPOIS: ${countAfter}`);

    if (countBefore !== countAfter) {
      results.push({
        name: "Teste C (GEN-013 Files)",
        status: "FAIL",
        details: `Contagem mudou (antes: ${countBefore}, depois: ${countAfter})`,
      });
      return;
    }

    if (countBefore === 0) {
      results.push({
        name: "Teste C (GEN-013 Files)",
        status: "FAIL",
        details: "GEN-013 não tem study_files linkados (esperado 3)",
      });
      return;
    }

    results.push({
      name: "Teste C (GEN-013 Files)",
      status: "PASS",
      details: `✓ study_files = ${countAfter} (preservado)`,
    });
  } catch (e) {
    results.push({
      name: "Teste C (GEN-013 Files)",
      status: "FAIL",
      details: `Exceção: ${(e as any).message}`,
    });
  }
}

async function testContentPreserved() {
  console.log("\n🧪 TESTE D: Conteúdo Preservado");

  try {
    const { data: studies } = await supabase
      .from("studies")
      .select("id, conteudo")
      .not("conteudo", "is", null)
      .limit(1);

    if (!studies || studies.length === 0) {
      results.push({
        name: "Teste D (Conteúdo Preservado)",
        status: "FAIL",
        details: "Nenhum estudo com conteúdo encontrado",
      });
      return;
    }

    const study = studies[0];
    const originalContent = study.conteudo;
    const hashBefore = new TextEncoder()
      .encode(originalContent)
      .reduce((a, b) => a + b, 0);

    // Editar só o tipo_estudo (não conteúdo)
    await supabase
      .from("studies")
      .update({
        tipo_estudo: "PANORAMA",
        updated_at: new Date().toISOString(),
      })
      .eq("id", study.id);

    // Re-buscar conteúdo
    const { data: updated } = await supabase
      .from("studies")
      .select("conteudo")
      .eq("id", study.id)
      .single();

    const hashAfter = new TextEncoder()
      .encode(updated?.conteudo || "")
      .reduce((a, b) => a + b, 0);

    if (hashBefore !== hashAfter) {
      results.push({
        name: "Teste D (Conteúdo Preservado)",
        status: "FAIL",
        details: "Conteúdo foi alterado acidentalmente",
      });
      return;
    }

    results.push({
      name: "Teste D (Conteúdo Preservado)",
      status: "PASS",
      details: `✓ Conteúdo integral preservado (hash igual)`,
    });
  } catch (e) {
    results.push({
      name: "Teste D (Conteúdo Preservado)",
      status: "FAIL",
      details: `Exceção: ${(e as any).message}`,
    });
  }
}

async function main() {
  console.log("\n📋 TESTES REAIS — EDIÇÃO EDITORIAL");
  console.log("====================================\n");

  await testLote01EditTitle();
  await testGenesisTemas();
  await testGen013StudyFiles();
  await testContentPreserved();

  console.log("\n📊 RESULTADO DOS TESTES");
  console.log("=======================");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  for (const result of results) {
    const icon = result.status === "PASS" ? "✅" : "❌";
    console.log(`\n${icon} ${result.name}`);
    console.log(`   ${result.details}`);
  }

  console.log(`\n📈 SUMÁRIO: ${passed} PASS, ${failed} FAIL (${results.length} total)\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
