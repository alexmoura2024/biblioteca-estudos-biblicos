import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      { auth: { persistSession: false } }
    );

    // 1. Buscar estudo atual com relações
    const { data: study } = await supabase
      .from("studies")
      .select("titulo, resumo, conteudo, tipo_estudo")
      .eq("id", id)
      .single();

    if (!study) {
      return NextResponse.json(
        { error: "Estudo não encontrado" },
        { status: 404 }
      );
    }

    type StudyRecord = Record<string, unknown>;
    const typedStudy = study as StudyRecord;

    // Buscar topics/characters atuais
    const { data: currentTopics } = await supabase
      .from("study_topics")
      .select("topic_id")
      .eq("study_id", id);
    const currentTopicIds = new Set(
      (currentTopics || []).map((t: Record<string, unknown>) => t.topic_id as string)
    );

    const { data: currentCharacters } = await supabase
      .from("study_characters")
      .select("character_id")
      .eq("study_id", id);
    const currentCharacterIds = new Set(
      (currentCharacters || []).map(
        (c: Record<string, unknown>) => c.character_id as string
      )
    );

    // 2. Registrar histórico (snapshot anterior)
    const changed: string[] = [];
    if (body.titulo !== typedStudy.titulo) changed.push("titulo");
    if (body.resumo !== typedStudy.resumo) changed.push("resumo");
    if (body.conteudo !== typedStudy.conteudo) changed.push("conteudo");
    if (body.tipo_estudo !== typedStudy.tipo_estudo) changed.push("tipo_estudo");

    const newTopicIds = new Set(body.topicIds || []);
    const newCharacterIds = new Set(body.characterIds || []);

    if (newTopicIds.size !== currentTopicIds.size ||
        ![...newTopicIds].every((id) => currentTopicIds.has(id as string))) {
      changed.push("temas");
    }

    if (
      newCharacterIds.size !== currentCharacterIds.size ||
      ![...newCharacterIds].every((id) => currentCharacterIds.has(id as string))
    ) {
      changed.push("personagens");
    }

    if (changed.length > 0) {
      await supabase.from("study_edits").insert({
        study_id: id,
        titulo_anterior: typedStudy.titulo as string,
        resumo_anterior: typedStudy.resumo as string,
        conteudo_anterior: typedStudy.conteudo as string,
        campos_alterados: changed,
      });
    }

    // 3. Atualizar estudo (mantém status REVIEW)
    const { error: updateError } = await supabase
      .from("studies")
      .update({
        titulo: (body.titulo as string) || (typedStudy.titulo as string),
        resumo: (body.resumo as string) || (typedStudy.resumo as string),
        conteudo: (body.conteudo as string) || (typedStudy.conteudo as string),
        tipo_estudo:
          (body.tipo_estudo as string) || (typedStudy.tipo_estudo as string),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: `Erro ao salvar: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 4. Atualizar temas (delete old, insert new)
    if (changed.includes("temas")) {
      await supabase
        .from("study_topics")
        .delete()
        .eq("study_id", id);

      if (newTopicIds.size > 0) {
        const topicsToInsert = Array.from(newTopicIds).map((topicId) => ({
          study_id: id,
          topic_id: topicId,
          peso: 1,
        }));
        await supabase.from("study_topics").insert(topicsToInsert);
      }
    }

    // 5. Atualizar personagens (delete old, insert new)
    if (changed.includes("personagens")) {
      await supabase
        .from("study_characters")
        .delete()
        .eq("study_id", id);

      if (newCharacterIds.size > 0) {
        const charactersToInsert = Array.from(newCharacterIds).map((charId) => ({
          study_id: id,
          character_id: charId,
          papel: "mencionado",
        }));
        await supabase
          .from("study_characters")
          .insert(charactersToInsert);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Alterações salvas com sucesso",
      changed,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Erro interno: ${e instanceof Error ? e.message : "desconhecido"}` },
      { status: 500 }
    );
  }
}
