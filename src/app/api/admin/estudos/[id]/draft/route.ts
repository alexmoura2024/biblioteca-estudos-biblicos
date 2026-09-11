import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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
        error: `Somente estudos em REVIEW podem voltar para DRAFT. Status atual: ${study.status}`,
      },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from("studies")
    .update({
      status: "DRAFT",
      visibilidade: "privado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "REVIEW");

  if (updateError) {
    return NextResponse.json(
      {
        error: `Erro ao retornar para DRAFT: ${updateError.message}`,
      },
      { status: 500 },
    );
  }

  await supabase.from("study_edits").insert({
    study_id: id,
    titulo_anterior: study.titulo,
    resumo_anterior: study.resumo,
    conteudo_anterior: study.conteudo,
    campos_alterados: ["status", "review_returned"],
  });

  revalidatePath("/admin/estudos");
  revalidatePath(`/admin/estudos/${id}`);

  return NextResponse.json({
    success: true,
    status: "DRAFT",
    visibilidade: "privado",
  });
}
