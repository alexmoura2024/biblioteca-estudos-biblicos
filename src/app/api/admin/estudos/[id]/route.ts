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

    // 1. Buscar estudo atual
    const { data: study } = await supabase
      .from("studies")
      .select("titulo, resumo, conteudo")
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

    // 2. Registrar histórico (snapshot anterior)
    const changed: string[] = [];
    if (body.titulo !== typedStudy.titulo) changed.push("titulo");
    if (body.resumo !== typedStudy.resumo) changed.push("resumo");
    if (body.conteudo !== typedStudy.conteudo) changed.push("conteudo");

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
    const { error } = await supabase
      .from("studies")
      .update({
        titulo: (body.titulo as string) || (typedStudy.titulo as string),
        resumo: (body.resumo as string) || (typedStudy.resumo as string),
        conteudo: (body.conteudo as string) || (typedStudy.conteudo as string),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: `Erro ao salvar: ${error.message}` },
        { status: 500 }
      );
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
