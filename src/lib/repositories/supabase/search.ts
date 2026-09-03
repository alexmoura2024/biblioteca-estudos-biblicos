import { getSupabaseClient } from "@/lib/supabase/client";
import type { SearchOutcome, SearchQuery, SearchRepository } from "@/lib/repositories/types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;

interface SearchStudiesRpcRow {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  autor: string;
  data_origem: string;
  score: number;
  total_count: number;
}

/**
 * Implementação Supabase de `SearchRepository` (Fase 2, Etapa 9).
 *
 * Delega todo o trabalho de filtro/ranking/paginação para a função
 * `public.search_studies` (supabase/migrations/..._search_function.sql)
 * — SECURITY INVOKER, então continua sujeita à RLS de `studies`. Esta
 * classe só traduz `SearchQuery` para os parâmetros da função e as
 * linhas devolvidas de volta para `SearchOutcome`; nunca busca "todos
 * os estudos" para filtrar em memória (o erro que o Marco 1.1/DEC-013
 * corrigiu e que a Fase 2 não pode reintroduzir).
 *
 * `SearchResultItem.study` aqui é sempre `StudySummary` SEM
 * `referenciaPrincipal`/`temas`/`series` resolvidos — a função RPC
 * devolve só as colunas escalares de `studies` (id/slug/titulo/resumo/
 * autor/data_origem) porque resolver as relações de cada resultado
 * dentro da função SQL tornaria o ranking muito mais caro. A página de
 * busca (`src/app/busca/page.tsx`) usa `StudyCard`, que já lida bem com
 * `referenciaPrincipal`/`temas`/`series` ausentes (não quebra, só não
 * mostra os badges) — mas se isso incomodar visualmente, o próximo
 * passo é buscar essas relações para os ids da página atual (poucos
 * itens, sem N+1) antes de devolver `SearchOutcome`. Não implementado
 * nesta sessão para manter o escopo da Etapa 9 no que o contrato exige.
 */
export class SupabaseSearchRepository implements SearchRepository {
  async search(query: SearchQuery): Promise<SearchOutcome> {
    const page = query.page && query.page > 0 ? Math.floor(query.page) : DEFAULT_PAGE;
    const limit = query.limit && query.limit > 0 ? Math.floor(query.limit) : DEFAULT_LIMIT;

    const hasQuery = Boolean(query.referencia || (query.texto && query.texto.trim().length > 0));
    const hasActiveFilter = Boolean(query.livro || query.testamento || query.tema || query.personagem || query.serie);
    // Mesma regra de "navegação por filtro puro" do motor em memória
    // (MockSearchRepository) — decidida uma única vez aqui e passada
    // como parâmetro, para não duplicar a regra dentro do SQL.
    const includeZeroScore = !hasQuery && hasActiveFilter;

    const { data, error } = await getSupabaseClient().rpc("search_studies", {
      p_texto: query.texto?.trim() || null,
      p_ref_book_slug: query.referencia?.book.slug ?? null,
      p_ref_capitulo: query.referencia?.capitulo ?? null,
      p_ref_versiculo_inicio: query.referencia?.versiculoInicio ?? null,
      p_ref_versiculo_fim: query.referencia?.versiculoFim ?? null,
      p_livro_slug: query.livro ?? null,
      p_testamento: query.testamento ?? null,
      p_tema_slug: query.tema ?? null,
      p_personagem_slug: query.personagem ?? null,
      p_serie_slug: query.serie ?? null,
      p_include_zero_score: includeZeroScore,
      p_page: page,
      p_limit: limit,
    });
    if (error) throw new Error(`SupabaseSearchRepository.search: ${error.message}`);

    const rows = (data ?? []) as SearchStudiesRpcRow[];
    const total = rows[0]?.total_count ?? 0;

    return {
      items: rows.map((row) => ({
        study: {
          id: row.id,
          slug: row.slug,
          titulo: row.titulo,
          resumo: row.resumo,
          autor: row.autor,
          dataOrigem: row.data_origem,
          temas: [],
          series: [],
        },
        score: row.score,
        matchedOn: [],
      })),
      total,
      page,
      limit,
    };
  }
}
