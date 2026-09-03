import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("study_edits")
      .select("id, titulo_anterior, resumo_anterior, conteudo_anterior, campos_alterados, created_at")
      .eq("study_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Erro ao buscar histórico: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ edits: data || [] });
  } catch (e) {
    return NextResponse.json(
      { error: `Erro interno: ${(e as any).message}` },
      { status: 500 }
    );
  }
}
