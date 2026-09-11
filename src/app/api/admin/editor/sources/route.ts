import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  buildLibrarySourceSearchFilter,
  libraryDraftSearchTerms,
  normalizeLibraryDraftRequest,
  rankLibrarySourceCandidates,
  type LibrarySourceCandidate,
} from "@/lib/admin/libraryDraft";

const SOURCE_STATUSES = ["PUBLISHED", "REVIEW", "DRAFT"] as const;
type SourceStatus = (typeof SOURCE_STATUSES)[number];

interface SourceRow {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  status: SourceStatus;
  updated_at: string;
}

function isSourceStatus(value: unknown): value is SourceStatus {
  return SOURCE_STATUSES.includes(value as SourceStatus);
}

export async function GET(request: NextRequest) {
  const searchRequest = normalizeLibraryDraftRequest(
    request.nextUrl.searchParams.get("q"),
  );
  const terms = libraryDraftSearchTerms(searchRequest);

  if (terms.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase administrativo não configurado." },
      { status: 503 },
    );
  }

  try {
    const supabase = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const outcomes = await Promise.all(
      terms.map(async (term) => {
        const filter = buildLibrarySourceSearchFilter(term);

        if (!filter) {
          return {
            term,
            count: 0,
            rows: [] as SourceRow[],
          };
        }

        const { data, error, count } = await supabase
          .from("studies")
          .select(
            "id, titulo, slug, resumo, status, updated_at",
            { count: "exact" },
          )
          .in("status", [...SOURCE_STATUSES])
          .not("autor", "ilike", "%Prototipo%")
          .or(filter)
          .order("updated_at", { ascending: false })
          .limit(24);

        if (error) {
          throw new Error(
            `Erro ao pesquisar “${term}”: ${error.message}`,
          );
        }

        const rows = (data ?? []).flatMap((row) => {
          if (!isSourceStatus(row.status)) return [];

          return [{
            id: String(row.id),
            titulo: String(row.titulo ?? ""),
            slug: String(row.slug ?? ""),
            resumo:
              typeof row.resumo === "string"
                ? row.resumo
                : null,
            status: row.status,
            updated_at: String(row.updated_at ?? ""),
          }];
        });

        return {
          term,
          count: count ?? rows.length,
          rows,
        };
      }),
    );

    const termCounts: Record<string, number> = {};
    const candidates = new Map<
      string,
      {
        row: SourceRow;
        matchedTerms: Set<string>;
      }
    >();

    for (const outcome of outcomes) {
      termCounts[outcome.term] = outcome.count;

      for (const row of outcome.rows) {
        const existing = candidates.get(row.id);

        if (existing) {
          existing.matchedTerms.add(outcome.term);
        } else {
          candidates.set(row.id, {
            row,
            matchedTerms: new Set([outcome.term]),
          });
        }
      }
    }

    const ranked: LibrarySourceCandidate[] =
      rankLibrarySourceCandidates(
        [...candidates.values()].map(
          ({ row, matchedTerms }) => ({
            id: row.id,
            title: row.titulo,
            slug: row.slug,
            summary: row.resumo ?? "",
            status: row.status,
            matchedTerms: [...matchedTerms],
          }),
        ),
        termCounts,
      );

    return NextResponse.json({
      query: searchRequest,
      terms,
      items: ranked.slice(0, 12).map((source) => ({
        ...source,
        reference: null,
        matchedOn: source.matchedTerms,
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
