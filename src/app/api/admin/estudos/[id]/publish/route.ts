import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  editorialGateReady,
  evaluateEditorialGate,
} from "@/lib/admin/editorialGate";

type HistoryRecord = {
  created_at: string;
  campos_alterados: string[] | null;
};

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

  if (study.status !== "REVIEW") {
    return NextResponse.json(
      {
        error: `Somente estudos em REVIEW podem ser publicados. Status atual: ${study.status}`,
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
    return NextResponse.json(
      {
        error:
          "O estudo deixou de atender ao gate editorial. Retorne para DRAFT e corrija as pendências.",
        gate,
      },
      { status: 400 },
    );
  }

  const { data: history, error: historyError } = await supabase
    .from("study_edits")
    .select("created_at,campos_alterados")
    .eq("study_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (historyError) {
    return NextResponse.json(
      {
        error: `Erro ao validar aprovação editorial: ${historyError.message}`,
      },
      { status: 500 },
    );
  }

  const records = (history || []) as HistoryRecord[];
  const snapshot = records.find((record) =>
    (record.campos_alterados || []).includes("review_snapshot"),
  );

  if (!snapshot) {
    return NextResponse.json(
      {
        error:
          "Esta revisão não possui snapshot. Retorne o estudo para DRAFT e envie novamente para REVIEW.",
      },
      { status: 409 },
    );
  }

  const snapshotTime = new Date(snapshot.created_at).getTime();

  const approval = records.find((record) => {
    const fields = record.campos_alterados || [];
    return (
      fields.includes("review_approved") &&
      new Date(record.created_at).getTime() >= snapshotTime
    );
  });

  if (!approval) {
    return NextResponse.json(
      {
        error:
          "A revisão ainda não foi aprovada. Use “Aprovar revisão” antes de publicar.",
      },
      { status: 409 },
    );
  }

  const approvalTime = new Date(approval.created_at).getTime();

  const changedAfterApproval = records.some((record) => {
    const recordTime = new Date(record.created_at).getTime();
    const fields = record.campos_alterados || [];

    return (
      recordTime > approvalTime &&
      !fields.includes("review_approved")
    );
  });

  if (changedAfterApproval) {
    return NextResponse.json(
      {
        error:
          "O estudo foi alterado após a aprovação. Aprove a revisão novamente antes de publicar.",
      },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from("studies")
    .update({
      status: "PUBLISHED",
      visibilidade: "publico",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "REVIEW");

  if (updateError) {
    return NextResponse.json(
      { error: `Erro ao publicar: ${updateError.message}` },
      { status: 500 },
    );
  }

  const { error: publishHistoryError } = await supabase
    .from("study_edits")
    .insert({
      study_id: id,
      titulo_anterior: study.titulo,
      resumo_anterior: study.resumo,
      conteudo_anterior: study.conteudo,
      campos_alterados: ["status", "visibilidade", "published"],
    });

  if (publishHistoryError) {
    console.error(
      "Estudo publicado, mas houve erro ao registrar histórico:",
      publishHistoryError,
    );
  }

  revalidatePath("/", "layout");

  return NextResponse.json({
    success: true,
    status: "PUBLISHED",
    visibilidade: "publico",
  });
}
