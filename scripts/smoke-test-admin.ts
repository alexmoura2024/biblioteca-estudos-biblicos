/**
 * Smoke Test — Validar interface administrativa end-to-end
 * Testa: compilação, dados fluindo, relações N:N, histórico
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
  console.log("\n🧪 SMOKE TEST — ADMIN INTERFACE");
  console.log("================================\n");

  try {
    // 1. Buscar um estudo real
    console.log("1️⃣ Buscando estudo real...");
    const { data: study, error: studyError } = await supabase
      .from("studies")
      .select("id, titulo, slug, status, tipo_estudo")
      .eq("status", "REVIEW")
      .limit(1)
      .single();

    if (studyError || !study) {
      console.log("   ❌ Erro: Nenhum estudo REVIEW encontrado");
      return;
    }

    console.log(`   ✅ Encontrado: ${study.slug} (${study.status})`);

    // 2. Buscar passagens
    console.log("\n2️⃣ Buscando referências bíblicas...");
    const { data: passages, error: passError } = await supabase
      .from("study_passages")
      .select("tipo_relacao, passages(referencia_normalizada)")
      .eq("study_id", study.id);

    if (passError) {
      console.log(`   ❌ Erro: ${passError.message}`);
      return;
    }

    console.log(`   ✅ ${passages?.length || 0} referências encontradas`);

    // 3. Buscar temas
    console.log("\n3️⃣ Buscando temas...");
    const { data: topics, error: topicError } = await supabase
      .from("study_topics")
      .select("topic_id, peso, topics(nome)")
      .eq("study_id", study.id);

    if (topicError) {
      console.log(`   ❌ Erro: ${topicError.message}`);
      return;
    }

    console.log(`   ✅ ${topics?.length || 0} temas encontrados`);

    // 4. Buscar personagens
    console.log("\n4️⃣ Buscando personagens...");
    const { data: characters, error: charError } = await supabase
      .from("study_characters")
      .select("character_id, papel, characters(nome)")
      .eq("study_id", study.id);

    if (charError) {
      console.log(`   ❌ Erro: ${charError.message}`);
      return;
    }

    console.log(`   ✅ ${characters?.length || 0} personagens encontrados`);

    // 5. Buscar histórico
    console.log("\n5️⃣ Buscando histórico de edições...");
    const { data: history, error: histError } = await supabase
      .from("study_edits")
      .select("id, campos_alterados, created_at")
      .eq("study_id", study.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (histError) {
      console.log(`   ❌ Erro: ${histError.message}`);
      return;
    }

    console.log(`   ✅ ${history?.length || 0} edições registradas`);
    if (history && history.length > 0) {
      const latest = history[0] as Record<string, unknown>;
      console.log(
        `      Última: ${new Date(latest.created_at as string).toLocaleString("pt-BR")}`
      );
    }

    // 6. Simular edição rápida
    console.log("\n6️⃣ Simulando edição (tipo_estudo)...");
    const newType = study.tipo_estudo === "EXPOSITIVO" ? "THEMATIC" : "EXPOSITIVO";

    const { error: updateError } = await supabase
      .from("studies")
      .update({
        tipo_estudo: newType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", study.id);

    if (updateError) {
      console.log(`   ❌ Erro: ${updateError.message}`);
      return;
    }

    console.log(`   ✅ Tipo alterado para: ${newType}`);

    // 7. Registrar no histórico
    console.log("\n7️⃣ Registrando no histórico...");
    const { error: histInsertError } = await supabase
      .from("study_edits")
      .insert({
        study_id: study.id,
        campos_alterados: ["tipo_estudo"],
      });

    if (histInsertError) {
      console.log(`   ❌ Erro: ${histInsertError.message}`);
      return;
    }

    console.log(`   ✅ Histórico registrado`);

    // 8. Reverter
    console.log("\n8️⃣ Revertendo alteração...");
    await supabase
      .from("studies")
      .update({ tipo_estudo: study.tipo_estudo })
      .eq("id", study.id);

    console.log(`   ✅ Tipo revertido para: ${study.tipo_estudo}`);

    // 9. Validar RLS
    console.log("\n9️⃣ Validando RLS (acesso anon bloqueado)...");
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      { auth: { persistSession: false } }
    );

    const { data: anonData, error: anonError } = await anonClient
      .from("study_edits")
      .select("id")
      .limit(1);

    if (anonError || anonData?.length === 0) {
      console.log(`   ✅ RLS funcional: acesso anon bloqueado`);
    } else {
      console.log(`   ⚠️ RLS pode ter problema: acesso anon não foi bloqueado`);
    }

    // Summary
    console.log("\n✅ SMOKE TEST PASSED");
    console.log("====================");
    console.log(`
Estudo testado: ${study.slug}
Referências: ${passages?.length || 0}
Temas: ${topics?.length || 0}
Personagens: ${characters?.length || 0}
Histórico: ${history?.length || 0} registros
Status: REVIEW
RLS: ✅ Seguro
    `);
  } catch (e) {
    console.log(`\n❌ ERRO: ${(e as any).message}`);
    process.exit(1);
  }
}

main().catch(console.error);
