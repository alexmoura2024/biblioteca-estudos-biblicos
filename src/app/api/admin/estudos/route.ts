import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/search/normalize";
import { parseReference } from "@/lib/search/referenceParser";

const ALLOWED_STUDY_TYPES = new Set([
  "EXPOSITIVO",
  "THEMATIC",
  "PANORAMA",
  "DOUTRINÁRIO",
]);

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase administrativo não configurado" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      titulo?: string;
      autor?: string;
      data_origem?: string;
      tipo_estudo?: string;
      referencia_principal?: string;
      resumo?: string;
      conteudo?: string;
      palavras_chave?: string;
    };

    const titulo = body.titulo?.trim() || "";
    const autor = body.autor?.trim() || "";
    const dataOrigem = body.data_origem?.trim() || "";
    const tipoEstudo = body.tipo_estudo?.trim() || "EXPOSITIVO";
    const referenciaPrincipal = (body.referencia_principal || "")
      .trim()
      .replace(/[\u2012\u2013\u2014\u2212]/g, "-")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ");
    const resumo = body.resumo?.trim() || "";
    const conteudo = body.conteudo?.trim() || "";

    if (!titulo) {
      return NextResponse.json(
        { error: "Informe o título do estudo." },
        { status: 400 }
      );
    }

    if (!autor) {
      return NextResponse.json(
        { error: "Informe o autor do estudo." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataOrigem)) {
      return NextResponse.json(
        { error: "Informe uma data de origem válida." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STUDY_TYPES.has(tipoEstudo)) {
      return NextResponse.json(
        { error: "Tipo de estudo inválido." },
        { status: 400 }
      );
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let passageId: string | null = null;

    if (referenciaPrincipal) {
      const parsed = parseReference(referenciaPrincipal);

      if (parsed.type === "none") {
        return NextResponse.json(
          { error: "A referência bíblica principal não foi reconhecida." },
          { status: 400 }
        );
      }

      if (parsed.type === "ambiguous") {
        return NextResponse.json(
          {
            error:
              "A referência bíblica é ambígua. Use o nome completo do livro.",
          },
          { status: 400 }
        );
      }

      if (parsed.type === "invalid") {
        return NextResponse.json(
          { error: "A referência bíblica principal é inválida." },
          { status: 400 }
        );
      }

      if (parsed.type === "book") {
        return NextResponse.json(
          {
            error:
              "Informe pelo menos o livro e o capítulo na referência principal.",
          },
          { status: 400 }
        );
      }

      const { data: dbBook, error: bookError } = await supabase
        .from("books")
        .select("id,nome,slug")
        .eq("slug", parsed.book.slug)
        .single();

      if (bookError || !dbBook) {
        return NextResponse.json(
          { error: "Livro bíblico não encontrado no catálogo." },
          { status: 400 }
        );
      }

      const referenciaNormalizada =
        parsed.type === "chapter"
          ? `${dbBook.nome} ${parsed.capitulo}`
          : `${dbBook.nome} ${parsed.capitulo}:${parsed.versiculoInicio}${
              parsed.versiculoFim !== undefined
                ? `-${parsed.versiculoFim}`
                : ""
            }`;

      const { data: existingPassages, error: lookupError } = await supabase
        .from("passages")
        .select("id")
        .eq("referencia_normalizada", referenciaNormalizada)
        .limit(1);

      if (lookupError) {
        return NextResponse.json(
          { error: `Erro ao consultar referência: ${lookupError.message}` },
          { status: 500 }
        );
      }

      if (existingPassages && existingPassages.length > 0) {
        passageId = existingPassages[0].id;
      } else {
        const { data: newPassage, error: passageCreateError } = await supabase
          .from("passages")
          .insert({
            book_id: dbBook.id,
            capitulo: parsed.capitulo,
            versiculo_inicio:
              parsed.type === "verse" ? parsed.versiculoInicio : null,
            versiculo_fim:
              parsed.type === "verse"
                ? parsed.versiculoFim ?? null
                : null,
            referencia_normalizada: referenciaNormalizada,
          })
          .select("id")
          .single();

        if (passageCreateError || !newPassage) {
          return NextResponse.json(
            {
              error: `Erro ao criar referência bíblica: ${
                passageCreateError?.message || "erro desconhecido"
              }`,
            },
            { status: 500 }
          );
        }

        passageId = newPassage.id;
      }
    }

    const baseSlug = slugify(titulo);

    if (!baseSlug) {
      return NextResponse.json(
        { error: "Não foi possível gerar um slug válido para o título." },
        { status: 400 }
      );
    }

    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const { data: existingStudy, error: slugLookupError } = await supabase
        .from("studies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugLookupError) {
        return NextResponse.json(
          { error: `Erro ao validar slug: ${slugLookupError.message}` },
          { status: 500 }
        );
      }

      if (!existingStudy) break;

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const palavrasChave = (body.palavras_chave || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const { data: study, error: studyError } = await supabase
      .from("studies")
      .insert({
        titulo,
        slug,
        resumo,
        conteudo,
        status: "DRAFT",
        visibilidade: "privado",
        autor,
        data_origem: dataOrigem,
        palavras_chave: palavrasChave,
        tipo_estudo: tipoEstudo,
      })
      .select("id,slug,status")
      .single();

    if (studyError || !study) {
      return NextResponse.json(
        {
          error: `Erro ao criar estudo: ${
            studyError?.message || "erro desconhecido"
          }`,
        },
        { status: 500 }
      );
    }

    if (passageId) {
      const { error: linkError } = await supabase
        .from("study_passages")
        .insert({
          study_id: study.id,
          passage_id: passageId,
          tipo_relacao: "MAIN",
          prioridade: 1,
        });

      if (linkError) {
        await supabase.from("studies").delete().eq("id", study.id);

        return NextResponse.json(
          {
            error: `O estudo não foi criado porque não foi possível vincular a referência principal: ${linkError.message}`,
          },
          { status: 500 }
        );
      }
    }

    revalidatePath("/admin/estudos");

    return NextResponse.json(
      {
        success: true,
        id: study.id,
        slug: study.slug,
        status: "DRAFT",
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: `Erro interno: ${
          e instanceof Error ? e.message : "desconhecido"
        }`,
      },
      { status: 500 }
    );
  }
}
