-- Busca estrita dedicada ao Pergunte à Biblioteca.
-- Aplicada no Supabase em 2026-09-10 como migration 20260910195324.
create or replace function public.search_studies_question_v1(
  p_texto text default null,
  p_ref_book_slug text default null,
  p_ref_capitulo integer default null,
  p_ref_versiculo_inicio integer default null,
  p_ref_versiculo_fim integer default null,
  p_livro_slug text default null,
  p_testamento text default null,
  p_tema_slug text default null,
  p_personagem_slug text default null,
  p_serie_slug text default null,
  p_include_zero_score boolean default false,
  p_page integer default 1,
  p_limit integer default 24
)
returns table(
  id uuid, slug text, titulo text, resumo text, autor text, data_origem date,
  score numeric, matched_on text[], total_count bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  with query_params as (
    select case
      when p_texto is not null and length(trim(p_texto)) > 0
        then websearch_to_tsquery('portuguese', p_texto)
      else null
    end as text_query
  ),
  base as (
    select s.*
    from public.studies s
    cross join query_params q
    where s.status = 'PUBLISHED'
      and s.visibilidade = 'publico'
      and (q.text_query is null or s.busca_texto @@ q.text_query)
      and (
        p_ref_book_slug is null or exists (
          select 1
          from public.study_passages sp
          join public.passages pg on pg.id = sp.passage_id
          join public.books bk on bk.id = pg.book_id
          where sp.study_id = s.id
            and bk.slug = p_ref_book_slug
            and (p_ref_capitulo is null or pg.capitulo = p_ref_capitulo)
            and (
              p_ref_versiculo_inicio is null
              or pg.versiculo_inicio is null
              or (
                pg.versiculo_inicio <= coalesce(p_ref_versiculo_fim, p_ref_versiculo_inicio)
                and coalesce(pg.versiculo_fim, pg.versiculo_inicio) >= p_ref_versiculo_inicio
              )
            )
        )
      )
      and (
        p_livro_slug is null or exists (
          select 1 from public.study_passages sp
          join public.passages pg on pg.id = sp.passage_id
          join public.books bk on bk.id = pg.book_id
          where sp.study_id = s.id and bk.slug = p_livro_slug
        )
      )
      and (
        p_testamento is null or exists (
          select 1 from public.study_passages sp
          join public.passages pg on pg.id = sp.passage_id
          join public.books bk on bk.id = pg.book_id
          where sp.study_id = s.id and bk.testamento = p_testamento
        )
      )
      and (
        p_tema_slug is null or exists (
          select 1 from public.study_topics st
          join public.topics t on t.id = st.topic_id
          where st.study_id = s.id and t.slug = p_tema_slug
        )
      )
      and (
        p_personagem_slug is null or exists (
          select 1 from public.study_characters sc
          join public.characters c on c.id = sc.character_id
          where sc.study_id = s.id and c.slug = p_personagem_slug
        )
      )
      and (
        p_serie_slug is null or exists (
          select 1 from public.study_series ss
          join public.series se on se.id = ss.series_id
          where ss.study_id = s.id and se.slug = p_serie_slug
        )
      )
  ),
  scored as (
    select
      b.*,
      (
        coalesce(ref.ref_score, 0)
        + case when q.text_query is null then 0 else
            ts_rank_cd(b.busca_texto, q.text_query) * 100
            + case when flags.title_match then 180 else 0 end
            + case when flags.topic_match then 120 else 0 end
            + case when flags.character_match then 110 else 0 end
            + case when flags.series_match then 90 else 0 end
            + case when flags.keyword_match then 70 else 0 end
            + case when flags.summary_match then 30 else 0 end
            + case when flags.content_match then 10 else 0 end
          end
      )::numeric as score,
      array_remove(array[
        case when coalesce(ref.ref_score, 0) > 0 then 'referência bíblica' end,
        case when flags.title_match then 'título' end,
        case when flags.topic_match then 'tema' end,
        case when flags.character_match then 'personagem' end,
        case when flags.series_match then 'série' end,
        case when flags.keyword_match then 'palavra-chave' end,
        case when flags.summary_match then 'resumo' end,
        case when flags.content_match then 'conteúdo' end
      ], null) as matched_on
    from base b
    cross join query_params q
    left join lateral (
      select max(case
        when p_ref_book_slug is null then 0
        when bk.slug <> p_ref_book_slug then 0
        when p_ref_capitulo is null then 500
        when pg.capitulo <> p_ref_capitulo then 0
        when p_ref_versiculo_inicio is null then 700
        when pg.versiculo_inicio is null then 850
        when pg.versiculo_inicio <= coalesce(p_ref_versiculo_fim, p_ref_versiculo_inicio)
          and coalesce(pg.versiculo_fim, pg.versiculo_inicio) >= p_ref_versiculo_inicio then 1000
        else 0
      end) as ref_score
      from public.study_passages sp
      join public.passages pg on pg.id = sp.passage_id
      join public.books bk on bk.id = pg.book_id
      where sp.study_id = b.id
    ) ref on true
    left join lateral (
      select
        q.text_query is not null and ts_filter(b.busca_texto, '{A}') @@ q.text_query as title_match,
        q.text_query is not null and ts_filter(b.busca_texto, '{B}') @@ q.text_query as keyword_match,
        q.text_query is not null and ts_filter(b.busca_texto, '{C}') @@ q.text_query as summary_match,
        q.text_query is not null and ts_filter(b.busca_texto, '{D}') @@ q.text_query as content_match,
        q.text_query is not null and exists (
          select 1 from public.study_topics st
          join public.topics t on t.id = st.topic_id
          where st.study_id = b.id
            and to_tsvector('portuguese', coalesce(t.nome, '')) @@ q.text_query
        ) as topic_match,
        q.text_query is not null and exists (
          select 1 from public.study_characters sc
          join public.characters c on c.id = sc.character_id
          where sc.study_id = b.id
            and to_tsvector('portuguese', coalesce(c.nome, '')) @@ q.text_query
        ) as character_match,
        q.text_query is not null and exists (
          select 1 from public.study_series ss
          join public.series se on se.id = ss.series_id
          where ss.study_id = b.id
            and to_tsvector('portuguese', coalesce(se.nome, '')) @@ q.text_query
        ) as series_match
    ) flags on true
  )
  select scored.id, scored.slug, scored.titulo, scored.resumo, scored.autor,
         scored.data_origem, scored.score, scored.matched_on,
         count(*) over () as total_count
  from scored
  where scored.score > 0 or p_include_zero_score
  order by scored.score desc, scored.titulo asc
  limit greatest(coalesce(p_limit, 24), 1)
  offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_limit, 24), 1);
$$;

revoke all on function public.search_studies_question_v1(
  text,text,integer,integer,integer,text,text,text,text,text,boolean,integer,integer
) from public;

grant execute on function public.search_studies_question_v1(
  text,text,integer,integer,integer,text,text,text,text,text,boolean,integer,integer
) to anon, authenticated, service_role;
