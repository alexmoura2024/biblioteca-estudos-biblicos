import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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
    .select("id,titulo,resumo,conteudo,status")
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
        error: `Somente estudos em REVIEW podem ser aprovados. Status atual: ${study.status}`,
      },
      { status: 409 },
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
        error: `Erro ao consultar histórico: ${historyError.message}`,
      },
      { status: 500 },
    );
  }

  const records = (history || []) as HistoryRecord[];
  let snapshot = records.find((record) =>
    (record.campos_alterados || []).includes("review_snapshot"),
  );

  if (!snapshot) {
    const { data: createdSnapshot, error: snapshotError } =
      await supabase
        .from("study_edits")
        .insert({
          study_id: id,
          titulo_anterior: study.titulo,
          resumo_anterior: study.resumo,
          conteudo_anterior: study.conteudo,
          campos_alterados: ["review_snapshot"],
        })
        .select("created_at,campos_alterados")
        .single();

    if (snapshotError || !createdSnapshot) {
      return NextResponse.json(
        {
          error: "Não foi possível criar o snapshot da revisão.",
        },
        { status: 500 },
      );
    }

    snapshot = createdSnapshot as HistoryRecord;
  }

  const snapshotTime = new Date(snapshot.created_at).getTime();

  const alreadyApproved = records.some((record) => {
    const fields = record.campos_alterados || [];
    return (
      fields.includes("review_approved") &&
      new Date(record.created_at).getTime() >= snapshotTime
    );
  });

  if (!alreadyApproved) {
    const { error: approvalError } = await supabase
      .from("study_edits")
      .insert({
        study_id: id,
        titulo_anterior: study.titulo,
        resumo_anterior: study.resumo,
        conteudo_anterior: study.conteudo,
        campos_alterados: ["review_approved"],
      });

    if (approvalError) {
      return NextResponse.json(
        {
          error: `Erro ao aprovar revisão: ${approvalError.message}`,
        },
        { status: 500 },
      );
    }
  }

  revalidatePath(`/admin/estudos/${id}`);

  return NextResponse.json({
    success: true,
    approved: true,
  });
}
