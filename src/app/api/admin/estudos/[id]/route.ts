import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseReference } from "@/lib/search/referenceParser";

interface PassageData {
  passage_id: string;
  referencia_normalizada: string;
  tipo_relacao: "MAIN" | "SECONDARY" | "CITED";
}

type PassageInput = {
  referencia_normalizada: string;
  tipo_relacao: "MAIN" | "SECONDARY" | "CITED";
};

const PASSAGE_TYPES = new Set(["MAIN", "SECONDARY", "CITED"]);

function normalizeReferenceInput(value: string) {
  return value
    .trim()
    .replace(/[\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
}

function isTransientFetchFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TypeError" ||
      error.name === "FetchError" ||
      /fetch failed|network|socket|econnreset|etimedout/i.test(error.message))
  );
}

async function withSupabaseRetry<T>(
  label: string,
  operation: () => PromiseLike<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientFetchFailure(error) || attempt === 3) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 350 * attempt),
      );
    }
  }

  throw new Error(
    `${label}: ${
      lastError instanceof Error ? lastError.message : "falha de rede"
    }`,
  );
}

async function resolvePassage(
  supabase: any,
  rawReference: string
): Promise<{ id: string; referencia: string }> {
  const normalizedInput = normalizeReferenceInput(rawReference);
  const parsed = parseReference(normalizedInput);

  if (parsed.type === "none") {
    throw new Error(`Referência não reconhecida: ${rawReference}`);
  }

  if (parsed.type === "ambiguous") {
    throw new Error(
      `Referência ambígua: ${rawReference}. Use o nome completo do livro.`
    );
  }

  if (parsed.type === "invalid") {
    throw new Error(`Referência bíblica inválida: ${rawReference}`);
  }

  if (parsed.type === "book") {
    throw new Error(
      `Referência incompleta: ${rawReference}. Informe pelo menos livro e capítulo.`
    );
  }

  const { data: dbBook, error: bookError } = await supabase
    .from("books")
    .select("id,nome,slug")
    .eq("slug", parsed.book.slug)
    .single();

  if (bookError || !dbBook) {
    throw new Error(`Livro bíblico não encontrado: ${parsed.book.nome}`);
  }

  const referencia =
    parsed.type === "chapter"
      ? `${dbBook.nome} ${parsed.capitulo}`
      : `${dbBook.nome} ${parsed.capitulo}:${parsed.versiculoInicio}${
          parsed.versiculoFim !== undefined ? `-${parsed.versiculoFim}` : ""
        }`;

  const { data: existing, error: lookupError } = await supabase
    .from("passages")
    .select("id")
    .eq("referencia_normalizada", referencia)
    .limit(1);

  if (lookupError) {
    throw new Error(
      `Erro ao consultar a referência ${referencia}: ${lookupError.message}`
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
        parsed.type === "verse" ? parsed.versiculoFim ?? null : null,
      referencia_normalizada: referencia,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(
      `Erro ao criar a referência ${referencia}: ${
        createError?.message || "erro desconhecido"
      }`
    );
  }

  return { id: created.id, referencia };
}

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

    const { data: study } = await supabase
      .from("studies")
      .select("titulo, resumo, conteudo, tipo_estudo, slug, status")
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

    const { data: currentPassages } = await supabase
      .from("study_passages")
      .select("passage_id, tipo_relacao, passages(referencia_normalizada)")
      .eq("study_id", id);

    const passages = (currentPassages || []).map(
      (p: Record<string, unknown>) => ({
        passage_id: (p.passage_id as string) || "",
        referencia_normalizada:
          ((p.passages as Record<string, unknown>)
            ?.referencia_normalizada as string) || "",
        tipo_relacao: (p.tipo_relacao as string) || "CITED",
      })
    ) as PassageData[];

    const { data: currentTopics } = await supabase
      .from("study_topics")
      .select("topic_id")
      .eq("study_id", id);

    const currentTopicIds = new Set(
      (currentTopics || []).map(
        (t: Record<string, unknown>) => t.topic_id as string
      )
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

    const changed: string[] = [];

    if (body.titulo !== typedStudy.titulo) changed.push("titulo");
    if (body.resumo !== typedStudy.resumo) changed.push("resumo");
    if (body.conteudo !== typedStudy.conteudo) changed.push("conteudo");
    if (body.tipo_estudo !== typedStudy.tipo_estudo)
      changed.push("tipo_estudo");

    const hasTopicIds = Array.isArray(body.topicIds);
    const hasCharacterIds = Array.isArray(body.characterIds);
    const hasPassages = Array.isArray(body.passages);

    const newTopicIds = hasTopicIds
      ? new Set<string>(body.topicIds)
      : new Set<string>(currentTopicIds);

    const newCharacterIds = hasCharacterIds
      ? new Set<string>(body.characterIds)
      : new Set<string>(currentCharacterIds);

    if (
      hasTopicIds &&
      (newTopicIds.size !== currentTopicIds.size ||
        ![...newTopicIds].every((topicId) => currentTopicIds.has(topicId)))
    ) {
      changed.push("temas");
    }

    if (
      hasCharacterIds &&
      (newCharacterIds.size !== currentCharacterIds.size ||
        ![...newCharacterIds].every((characterId) =>
          currentCharacterIds.has(characterId)
        ))
    ) {
      changed.push("personagens");
    }

    const rawPassages = (hasPassages ? body.passages : passages) as Array<{
      referencia_normalizada?: string;
      tipo_relacao?: string;
    }>;

    const requestedPassages: PassageInput[] = rawPassages.map((passage) => {
      const reference = passage.referencia_normalizada?.trim() || "";
      const relation = passage.tipo_relacao || "";

      if (!reference) {
        throw new Error("Há uma referência bíblica vazia.");
      }

      if (!PASSAGE_TYPES.has(relation)) {
        throw new Error(`Tipo de relação inválido para ${reference}.`);
      }

      return {
        referencia_normalizada: reference,
        tipo_relacao: relation as PassageInput["tipo_relacao"],
      };
    });

    const mainCount = requestedPassages.filter(
      (passage) => passage.tipo_relacao === "MAIN"
    ).length;

    if (mainCount > 1) {
      return NextResponse.json(
        { error: "O estudo pode ter no máximo uma referência principal." },
        { status: 400 }
      );
    }

    // Primeiro resolve/valida TODAS as passagens. Só depois altera as relações.
    const resolvedPassages: Array<{
      passage_id: string;
      referencia_normalizada: string;
      tipo_relacao: PassageInput["tipo_relacao"];
    }> = [];

    for (const passage of requestedPassages) {
      const resolved = await resolvePassage(
        supabase,
        passage.referencia_normalizada
      );

      resolvedPassages.push({
        passage_id: resolved.id,
        referencia_normalizada: resolved.referencia,
        tipo_relacao: passage.tipo_relacao,
      });
    }

    const uniquePassageIds = new Set(
      resolvedPassages.map((passage) => passage.passage_id)
    );

    if (uniquePassageIds.size !== resolvedPassages.length) {
      return NextResponse.json(
        {
          error:
            "A mesma referência bíblica foi informada mais de uma vez. Remova a duplicação.",
        },
        { status: 400 }
      );
    }

    const oldPassagesSet = new Set(
      passages.map(
        (p) =>
          `${normalizeReferenceInput(p.referencia_normalizada)}|${p.tipo_relacao}`
      )
    );

    const newPassagesSet = new Set(
      resolvedPassages.map(
        (p) =>
          `${normalizeReferenceInput(p.referencia_normalizada)}|${p.tipo_relacao}`
      )
    );

    const passagesChanged =
      hasPassages &&
      (oldPassagesSet.size !== newPassagesSet.size ||
        ![...newPassagesSet].every((passage) =>
          oldPassagesSet.has(passage)
        ));

    if (passagesChanged) {
      changed.push("passages");
    }

    const { error: updateError } = await supabase
      .from("studies")
      .update({
        titulo: (body.titulo as string) || (typedStudy.titulo as string),
        resumo: (body.resumo as string) || (typedStudy.resumo as string),
        conteudo:
          (body.conteudo as string) || (typedStudy.conteudo as string),
        tipo_estudo:
          (body.tipo_estudo as string) ||
          (typedStudy.tipo_estudo as string),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: `Erro ao salvar: ${updateError.message}` },
        { status: 500 }
      );
    }

    if (changed.includes("temas")) {
      const { error: deleteTopicsError } = await withSupabaseRetry(
        "Excluir temas atuais",
        () =>
          supabase
            .from("study_topics")
            .delete()
            .eq("study_id", id),
      );

      if (deleteTopicsError) {
        throw new Error(
          `Erro ao atualizar temas: ${deleteTopicsError.message}`,
        );
      }

      if (newTopicIds.size > 0) {
        const { error: insertTopicsError } = await withSupabaseRetry(
          "Gravar temas",
          () =>
            supabase
              .from("study_topics")
              .insert(
                Array.from(newTopicIds).map((topicId) => ({
                  study_id: id,
                  topic_id: topicId,
                  peso: 1,
                })),
              ),
        );

        if (insertTopicsError) {
          throw new Error(
            `Erro ao atualizar temas: ${insertTopicsError.message}`,
          );
        }
      }
    }

    if (changed.includes("personagens")) {
      const { error: deleteCharactersError } = await withSupabaseRetry(
        "Excluir personagens atuais",
        () =>
          supabase
            .from("study_characters")
            .delete()
            .eq("study_id", id),
      );

      if (deleteCharactersError) {
        throw new Error(
          `Erro ao atualizar personagens: ${deleteCharactersError.message}`,
        );
      }

      if (newCharacterIds.size > 0) {
        const { error: insertCharactersError } = await withSupabaseRetry(
          "Gravar personagens",
          () =>
            supabase
              .from("study_characters")
              .insert(
                Array.from(newCharacterIds).map((characterId) => ({
                  study_id: id,
                  character_id: characterId,
                  papel: "mencionado",
                })),
              ),
        );

        if (insertCharactersError) {
          throw new Error(
            `Erro ao atualizar personagens: ${insertCharactersError.message}`,
          );
        }
      }
    }

    if (passagesChanged) {
      const { error: deletePassagesError } = await withSupabaseRetry(
        "Excluir referências atuais",
        () =>
          supabase
            .from("study_passages")
            .delete()
            .eq("study_id", id),
      );

      if (deletePassagesError) {
        throw new Error(
          `Erro ao atualizar referências: ${deletePassagesError.message}`,
        );
      }

      if (resolvedPassages.length > 0) {
        const { error: insertPassagesError } = await withSupabaseRetry(
          "Gravar referências",
          () =>
            supabase
              .from("study_passages")
              .insert(
                resolvedPassages.map((passage, index) => ({
                  study_id: id,
                  passage_id: passage.passage_id,
                  tipo_relacao: passage.tipo_relacao,
                  prioridade: index + 1,
                })),
              ),
        );

        if (insertPassagesError) {
          throw new Error(
            `Erro ao atualizar referências: ${insertPassagesError.message}`,
          );
        }
      }
    }

    if (changed.length > 0) {
      const { error: historyError } = await supabase
        .from("study_edits")
        .insert({
          study_id: id,
          titulo_anterior: typedStudy.titulo as string,
          resumo_anterior: typedStudy.resumo as string,
          conteudo_anterior: typedStudy.conteudo as string,
          campos_alterados: changed,
        });

      if (historyError) {
        console.error("Erro ao registrar histórico:", historyError);
      }
    }

    revalidatePath(`/admin/estudos/${id}`);
    revalidatePath("/admin/estudos");

    if (
      typedStudy.status === "PUBLISHED" &&
      typeof typedStudy.slug === "string" &&
      typedStudy.slug
    ) {
      revalidatePath(`/estudo/${typedStudy.slug}`);
    }

    return NextResponse.json({
      success: true,
      message:
        typedStudy.status === "PUBLISHED"
          ? "Alterações salvas e página pública atualizada"
          : "Alterações salvas com sucesso",
      changed,
    });
  } catch (e) {
    const transient = isTransientFetchFailure(e);

    return NextResponse.json(
      {
        error: transient
          ? "Falha temporária de comunicação com o banco. A operação foi interrompida com segurança. Tente salvar novamente."
          : `Erro interno: ${
              e instanceof Error ? e.message : "desconhecido"
            }`,
      },
      { status: transient ? 503 : 500 },
    );
  }
}
