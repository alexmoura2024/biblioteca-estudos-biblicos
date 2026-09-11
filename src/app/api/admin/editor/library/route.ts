import { NextRequest, NextResponse } from "next/server";
import { searchRepository } from "@/lib/repositories";
import { prepareLibraryQuestion } from "@/lib/search/libraryQuestion";

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const query = prepareLibraryQuestion(term);

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  try {
    const outcome = await searchRepository.search({
      texto: query,
      mode: "strict",
      page: 1,
      limit: 6,
    });

    return NextResponse.json({
      items: outcome.items.map(({ study, matchedOn }) => ({
        title: study.titulo,
        slug: study.slug,
        summary: study.resumo,
        reference:
          study.referenciaPrincipal?.referenciaNormalizada ?? null,
        matchedOn,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível consultar o acervo.",
      },
      { status: 500 },
    );
  }
}
