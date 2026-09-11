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

function uniqueIds(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, limit);
}

async function catalogIdsExist(
  supabase: any,
  table: "topics" | "characters" | "series",
  ids: string[],
): Promise<boolean> {
  if (ids.length === 0) return true;

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .in("id", ids);

  if (error) {
    throw new Error(
      `Erro ao validar classificação em ${table}: ${error.message}`,
    );
  }

  return (data ?? []).length === ids.length;
}

type ApprovedReference = {
  reference: string;
  relation: "SECONDARY" | "CITED";
};

function normalizeApprovedReferences(value: unknown): ApprovedReference[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: ApprovedReference[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const reference =
      typeof record.reference === "string"
        ? record.reference.trim()
        : "";
    const relation =
      record.relation === "SECONDARY" || record.relation === "CITED"
        ? record.relation
        : null;

    if (!reference || !relation || seen.has(reference.toLowerCase())) {
      continue;
    }

    seen.add(reference.toLowerCase());
    normalized.push({ reference, relation });

    if (normalized.length >= 24) break;
  }

  return normalized;
}

async function resolveAdditionalPassage(
  supabase: any,
  rawReference: string,
): Promise<{ id: string; referencia: string }> {
  const normalizedInput = rawReference
    .trim()
    .replace(/[\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");

  const parsed = parseReference(normalizedInput);

  if (
    parsed.type === "none" ||
    parsed.type === "ambiguous" ||
    parsed.type === "invalid" ||
    parsed.type === "book"
  ) {
    throw new Error(
      `Referência bíblica aprovada inválida: ${rawReference}`,
    );
  }

  const { data: dbBook, error: bookError } = await supabase
    .from("books")
    .select("id,nome,slug")
    .eq("slug", parsed.book.slug)
    .single();

  if (bookError || !dbBook) {
    throw new Error(
      `Livro bíblico não encontrado: ${parsed.book.nome}`,
    );
  }

  const referencia =
    parsed.type === "chapter"
      ? `${dbBook.nome} ${parsed.capitulo}`
      : `${dbBook.nome} ${parsed.capitulo}:${parsed.versiculoInicio}${
          parsed.versiculoFim !== undefined
            ? `-${parsed.versiculoFim}`
            : ""
        }`;

  const { data: existing, error: lookupError } = await supabase
    .from("passages")
    .select("id")
    .eq("referencia_normalizada", referencia)
    .limit(1);

  if (lookupError) {
    throw new Error(
      `Erro ao consultar ${referencia}: ${lookupError.message}`,
    );
  }

  if (existing && existing.length > 0) {
    return { id: existing[0].id, referencia };
  }

  const { data: created, error: createError } = await supabase
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
      referencia_normalizada: referencia,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(
      `Erro ao criar ${referencia}: ${
        createError?.message || "erro desconhecido"
      }`,
    );
  }

  return { id: created.id, referencia };
}

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
      topic_ids?: string[];
      character_ids?: string[];
      series_ids?: string[];
      approved_references?: Array<{
        reference?: string;
        relation?: string;
      }>;
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

    const topicIds = uniqueIds(body.topic_ids, 12);
    const characterIds = uniqueIds(body.character_ids, 12);
    const seriesIds = uniqueIds(body.series_ids, 6);

    const [
      topicsValid,
      charactersValid,
      seriesValid,
    ] = await Promise.all([
      catalogIdsExist(supabase, "topics", topicIds),
      catalogIdsExist(supabase, "characters", characterIds),
      catalogIdsExist(supabase, "series", seriesIds),
    ]);

    if (!topicsValid || !charactersValid || !seriesValid) {
      return NextResponse.json(
        {
          error:
            "A classificação contém um vínculo que não existe mais no catálogo. Gere novamente as sugestões.",
        },
        { status: 400 },
      );
    }

    const approvedReferences = normalizeApprovedReferences(
      body.approved_references,
    );

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

    const resolvedApprovedReferences: Array<{
      passage_id: string;
      referencia_normalizada: string;
      tipo_relacao: "SECONDARY" | "CITED";
    }> = [];

    for (const approved of approvedReferences) {
      const resolved = await resolveAdditionalPassage(
        supabase,
        approved.reference,
      );

      if (passageId && resolved.id === passageId) {
        continue;
      }

      if (
        resolvedApprovedReferences.some(
          (item) => item.passage_id === resolved.id,
        )
      ) {
        continue;
      }

      resolvedApprovedReferences.push({
        passage_id: resolved.id,
        referencia_normalizada: resolved.referencia,
        tipo_relacao: approved.relation,
      });
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

    const rollbackStudy = async (message: string) => {
      await supabase.from("studies").delete().eq("id", study.id);

      return NextResponse.json(
        { error: message },
        { status: 500 },
      );
    };

    const passageRows: Array<{
      study_id: string;
      passage_id: string;
      tipo_relacao: "MAIN" | "SECONDARY" | "CITED";
      prioridade: number;
    }> = [];

    if (passageId) {
      passageRows.push({
        study_id: study.id,
        passage_id: passageId,
        tipo_relacao: "MAIN",
        prioridade: 1,
      });
    }

    resolvedApprovedReferences.forEach((passage, index) => {
      passageRows.push({
        study_id: study.id,
        passage_id: passage.passage_id,
        tipo_relacao: passage.tipo_relacao,
        prioridade: index + 2,
      });
    });

    if (passageRows.length > 0) {
      const { error: linkError } = await supabase
        .from("study_passages")
        .insert(passageRows);

      if (linkError) {
        return rollbackStudy(
          `O estudo não foi criado porque não foi possível vincular as referências aprovadas: ${linkError.message}`,
        );
      }
    }

    if (topicIds.length > 0) {
      const { error: topicLinkError } = await supabase
        .from("study_topics")
        .insert(
          topicIds.map((topicId) => ({
            study_id: study.id,
            topic_id: topicId,
            peso: 1,
          })),
        );

      if (topicLinkError) {
        return rollbackStudy(
          `O estudo não foi criado porque não foi possível vincular os temas aprovados: ${topicLinkError.message}`,
        );
      }
    }

    if (characterIds.length > 0) {
      const { error: characterLinkError } = await supabase
        .from("study_characters")
        .insert(
          characterIds.map((characterId) => ({
            study_id: study.id,
            character_id: characterId,
            papel: "mencionado",
          })),
        );

      if (characterLinkError) {
        return rollbackStudy(
          `O estudo não foi criado porque não foi possível vincular os personagens aprovados: ${characterLinkError.message}`,
        );
      }
    }

    if (seriesIds.length > 0) {
      const seriesRows: Array<{
        study_id: string;
        series_id: string;
        ordem: number;
      }> = [];

      for (const seriesId of seriesIds) {
        const { data: lastRows, error: seriesOrderError } =
          await supabase
            .from("study_series")
            .select("ordem")
            .eq("series_id", seriesId)
            .order("ordem", { ascending: false })
            .limit(1);

        if (seriesOrderError) {
          return rollbackStudy(
            `O estudo não foi criado porque não foi possível determinar a ordem da série: ${seriesOrderError.message}`,
          );
        }

        const lastOrder =
          lastRows && lastRows.length > 0
            ? Number(lastRows[0].ordem) || 0
            : 0;

        seriesRows.push({
          study_id: study.id,
          series_id: seriesId,
          ordem: lastOrder + 1,
        });
      }

      const { error: seriesLinkError } = await supabase
        .from("study_series")
        .insert(seriesRows);

      if (seriesLinkError) {
        return rollbackStudy(
          `O estudo não foi criado porque não foi possível vincular as séries aprovadas: ${seriesLinkError.message}`,
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
        classification: {
          topics: topicIds.length,
          characters: characterIds.length,
          series: seriesIds.length,
        },
        references: passageRows.length,
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
