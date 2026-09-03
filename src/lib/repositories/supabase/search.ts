import { getSupabaseClient } from "@/lib/supabase/client";
import { assembleStudySummary } from "@/lib/repositories/supabase/mappers";
import { fetchPassageJoins, fetchSeriesJoins, fetchTopicJoins } from "@/lib/repositories/supabase/relations";
import type { StudyRow } from "@/lib/repositories/supabase/rows";
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
 * A função RPC em si devolve só as colunas escalares de `studies`
 * (id/slug/titulo/resumo/autor/data_origem) — resolver `temas`/`series`/
 * `referenciaPrincipal` dentro da função SQL tornaria o ranking mais
 * caro, e filtrar/pontuar é o trabalho que precisa mesmo rodar no banco
 * (DEC-022). Por isso este repositório faz uma segunda etapa, fora da
 * RPC: para o conjunto (pequeno — no máximo `limit` itens) de estudos
 * já escolhidos e ordenados pela RPC, busca as três relações que um
 * `StudySummary` precisa (`fetchPassageJoins`/`fetchTopicJoins`/
 * `fetchSeriesJoins`, `src/lib/repositories/supabase/relations.ts` —
 * três consultas com `.in(studyIds)`, nunca uma por estudo) e monta o
 * resumo com `assembleStudySummary` (mesma função usada por
 * `SupabaseStudyRepository`). Isso fecha a paridade com
 * `MockSearchRepository`, que sempre devolve `StudySummary` completo
 * (Etapa 11 — antes desta correção, os resultados de busca vinham sem
 * os badges de referência/tema/série que a home e as listagens por
 * livro/tema/personagem/série já mostravam, uma divergência funcional
 * real com o Mock, não só uma diferença de implementação).
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

    if (rows.length === 0) {
      return { items: [], total, page, limit };
    }

    // Segunda etapa (fora da RPC, ver comentário da classe): resolve
    // referência principal/temas/séries só para os ids que a RPC já
    // escolheu e ordenou — no máximo `limit` estudos, nunca o acervo
    // inteiro, e nunca uma consulta por estudo.
    const studyIds = rows.map((row) => row.id);
    const [passages, topics, series] = await Promise.all([
      fetchPassageJoins(studyIds),
      fetchTopicJoins(studyIds),
      fetchSeriesJoins(studyIds),
    ]);

    return {
      items: rows.map((row) => {
        // A RPC devolve só as colunas escalares de `studies`; as demais
        // propriedades de StudyRow (conteudo/status/visibilidade/...)
        // não são lidas por `assembleStudySummary`, então este objeto
        // parcial é suficiente — o cast documenta essa fronteira.
        const studyRow = {
          id: row.id,
          slug: row.slug,
          titulo: row.titulo,
          resumo: row.resumo,
          autor: row.autor,
          data_origem: row.data_origem,
        } as StudyRow;

        return {
          study: assembleStudySummary(
            studyRow,
            passages.filter((p) => p.study_id === row.id),
            topics.filter((t) => t.study_id === row.id),
            series.filter((s) => s.study_id === row.id),
          ),
          score: row.score,
          matchedOn: [],
        };
      }),
      total,
      page,
      limit,
    };
  }
}
