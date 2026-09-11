import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  editorialGateReady,
  evaluateEditorialGate,
} from "@/lib/admin/editorialGate";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase administrativo não configurado" },
      { status: 503 },
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: study, error: studyError } = await supabase
    .from("studies")
    .select(
      "id,titulo,resumo,conteudo,status,visibilidade,autor,data_origem,palavras_chave",
    )
    .eq("id", id)
    .single();

  if (studyError || !study) {
    return NextResponse.json(
      { error: "Estudo não encontrado" },
      { status: 404 },
    );
  }

  if (study.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: `Somente estudos em DRAFT podem ser enviados para REVIEW. Status atual: ${study.status}`,
      },
      { status: 409 },
    );
  }

  const { data: passages, error: passageError } = await supabase
    .from("study_passages")
    .select("tipo_relacao")
    .eq("study_id", id);

  if (passageError) {
    return NextResponse.json(
      {
        error: `Erro ao validar referências: ${passageError.message}`,
      },
      { status: 500 },
    );
  }

  const gate = evaluateEditorialGate({
    titulo: study.titulo || "",
    autor: study.autor || "",
    data_origem: study.data_origem || "",
    resumo: study.resumo || "",
    conteudo: study.conteudo || "",
    palavras_chave: study.palavras_chave || [],
    passages: passages || [],
  });

  if (!editorialGateReady(gate)) {
    const pendencias = gate
      .filter((check) => !check.pass)
      .map((check) => check.label.toLowerCase());

    return NextResponse.json(
      {
        error:
          "Antes de enviar para revisão, complete: " +
          pendencias.join(", "),
        gate,
      },
      { status: 400 },
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
      {
        error: `Erro ao enviar para revisão: ${updateError.message}`,
      },
      { status: 500 },
    );
  }

  const { error: snapshotError } = await supabase
    .from("study_edits")
    .insert({
      study_id: id,
      titulo_anterior: study.titulo,
      resumo_anterior: study.resumo,
      conteudo_anterior: study.conteudo,
      campos_alterados: ["review_snapshot", "status"],
    });

  if (snapshotError) {
    await supabase
      .from("studies")
      .update({ status: "DRAFT", visibilidade: "privado" })
      .eq("id", id);

    return NextResponse.json(
      {
        error:
          "Não foi possível criar o snapshot da revisão. O estudo permaneceu em DRAFT.",
      },
      { status: 500 },
    );
  }

  revalidatePath("/admin/estudos");
  revalidatePath(`/admin/estudos/${id}`);

  return NextResponse.json({
    success: true,
    status: "REVIEW",
    visibilidade: "privado",
    gate,
    snapshot: true,
  });
}
