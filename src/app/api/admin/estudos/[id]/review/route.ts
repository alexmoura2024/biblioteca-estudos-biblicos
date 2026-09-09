import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase administrativo não configurado" },
      { status: 503 }
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: study, error: studyError } = await supabase
    .from("studies")
    .select("id,titulo,resumo,conteudo,status,visibilidade")
    .eq("id", id)
    .single();

  if (studyError || !study) {
    return NextResponse.json(
      { error: "Estudo não encontrado" },
      { status: 404 }
    );
  }

  if (study.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: `Somente estudos em DRAFT podem ser enviados para REVIEW. Status atual: ${study.status}`,
      },
      { status: 409 }
    );
  }

  const pendencias: string[] = [];

  if (!study.titulo?.trim()) pendencias.push("título");
  if (!study.resumo?.trim()) pendencias.push("resumo");
  if (!study.conteudo?.trim()) pendencias.push("conteúdo");

  const { data: mainPassages, error: passageError } = await supabase
    .from("study_passages")
    .select("passage_id")
    .eq("study_id", id)
    .eq("tipo_relacao", "MAIN")
    .limit(1);

  if (passageError) {
    return NextResponse.json(
      { error: `Erro ao validar referência principal: ${passageError.message}` },
      { status: 500 }
    );
  }

  if (!mainPassages || mainPassages.length === 0) {
    pendencias.push("referência bíblica principal");
  }

  if (pendencias.length > 0) {
    return NextResponse.json(
      {
        error:
          "Antes de enviar para revisão, complete: " + pendencias.join(", "),
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("studies")
    .update({
      status: "REVIEW",
      visibilidade: "privado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "DRAFT");

  if (updateError) {
    return NextResponse.json(
      { error: `Erro ao enviar para revisão: ${updateError.message}` },
      { status: 500 }
    );
  }

  const { error: historyError } = await supabase
    .from("study_edits")
    .insert({
      study_id: id,
      titulo_anterior: study.titulo,
      resumo_anterior: study.resumo,
      conteudo_anterior: study.conteudo,
      campos_alterados: ["status"],
    });

  if (historyError) {
    console.error(
      "Estudo enviado para REVIEW, mas houve erro ao registrar histórico:",
      historyError
    );
  }

  revalidatePath("/admin/estudos");
  revalidatePath(`/admin/estudos/${id}`);

  return NextResponse.json({
    success: true,
    status: "REVIEW",
    visibilidade: "privado",
  });
}
