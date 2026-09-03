-- Fase 2 — Etapa 9 (busca) + parte mínima da Etapa 4 (FTS estritamente
-- necessária ao contrato atual).
--
-- Objetivo: dar a SearchRepository.search() (src/lib/repositories/types.ts)
-- uma implementação Postgres que filtra e pontua no banco — nunca traz
-- todos os estudos para a aplicação filtrar em memória (essa era
-- exatamente a arquitetura que o Marco 1.1/DEC-013 corrigiu; a Fase 2
-- não pode reintroduzi-la). pgvector/embeddings/RAG continuam fora de
-- escopo (Fases 6/8) — isto é busca lexical + referência determinística,
-- a mesma Fase A/B de sempre, agora em SQL.
--
-- security invoker (padrão, não escrito "security definer" em lugar
-- nenhum): a função search_studies roda com os privilégios de quem a
-- chama, então RLS em public.studies continua se aplicando por dentro
-- dela. Isso é obrigatório — uma função SECURITY DEFINER aqui vazaria
-- DRAFT/REVIEW/ARCHIVED para o público, o oposto do que DEC-020 pede.

-- ------------------------------------------------------------
-- Coluna de busca textual (tsvector), mantida por trigger
-- ------------------------------------------------------------
-- Não é uma "generated column" porque to_tsvector(regconfig, text) é
-- STABLE, não IMMUTABLE (exigido por colunas geradas) — o padrão
-- recomendado pela documentação do Postgres para este caso é uma coluna
-- normal mantida por trigger BEFORE INSERT OR UPDATE, o que fazemos aqui.
alter table public.studies add column busca_texto tsvector;

create function public.studies_set_busca_texto() returns trigger
  language plpgsql
  as $$
begin
  new.busca_texto :=
    setweight(to_tsvector('portuguese', coalesce(new.titulo, '')), 'A') ||
    setweight(to_tsvector('portuguese', array_to_string(coalesce(new.palavras_chave, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(new.resumo, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(new.conteudo, '')), 'D');
  return new;
end;
$$;

create trigger studies_busca_texto_trigger
  before insert or update of titulo, resumo, conteudo, palavras_chave
  on public.studies
  for each row
  execute function public.studies_set_busca_texto();

create index studies_busca_texto_idx on public.studies using gin (busca_texto);

-- ------------------------------------------------------------
-- search_studies — a fronteira que SupabaseSearchRepository chama
-- ------------------------------------------------------------
-- Ranking (mesmos três níveis de referência documentados em
-- src/lib/search/search.ts, DEC-014): match exato de versículo (1000)
-- > mesmo livro+capítulo sem match exato, ou passagem só no nível de
-- capítulo (700) > só o livro bate (500). Pontuação textual (ts_rank)
-- soma-se a isso, igual ao motor em memória soma referência + léxico.
--
-- p_include_zero_score existe para reproduzir a mesma regra de
-- "navegação por filtro puro" do motor em memória
-- (src/lib/repositories/mock.ts, MockSearchRepository): sem texto/
-- referência mas com ao menos um filtro ativo, todo estudo que passa
-- no WHERE é um resultado válido (score 0 incluso). A decisão de quando
-- isso vale é tomada uma única vez em TypeScript
-- (src/lib/repositories/supabase/search.ts) e passada como booleano,
-- para não duplicar essa regra em dois lugares que podem divergir.
create function public.search_studies(
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
returns table (
  id uuid,
  slug text,
  titulo text,
  resumo text,
  autor text,
  data_origem date,
  score numeric,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with base as (
    select s.*
    from public.studies s
    where s.status = 'PUBLISHED'
      and s.visibilidade = 'publico'
      and (
        p_livro_slug is null or exists (
          select 1
          from public.study_passages sp
          join public.passages pg on pg.id = sp.passage_id
          join public.books b on b.id = pg.book_id
          where sp.study_id = s.id and b.slug = p_livro_slug
        )
      )
      and (
        p_testamento is null or exists (
          select 1
          from public.study_passages sp
          join public.passages pg on pg.id = sp.passage_id
          join public.books b on b.id = pg.book_id
          where sp.study_id = s.id and b.testamento = p_testamento
        )
      )
      and (
        p_tema_slug is null or exists (
          select 1
          from public.study_topics st
          join public.topics t on t.id = st.topic_id
          where st.study_id = s.id and t.slug = p_tema_slug
        )
      )
      and (
        p_personagem_slug is null or exists (
          select 1
          from public.study_characters sc
          join public.characters c on c.id = sc.character_id
          where sc.study_id = s.id and c.slug = p_personagem_slug
        )
      )
      and (
        p_serie_slug is null or exists (
          select 1
          from public.study_series ss
          join public.series se on se.id = ss.series_id
          where ss.study_id = s.id and se.slug = p_serie_slug
        )
      )
  ),
  scored as (
    select
      base.*,
      coalesce(ref.ref_score, 0) + coalesce(txt.text_score, 0) as score
    from base
    left join lateral (
      -- Maior score de referência entre todas as passagens deste
      -- estudo (um estudo pode ter várias — DEC-015). Sem referência
      -- pedida (p_ref_book_slug null), ref_score é sempre 0.
      select max(
        case
          when p_ref_book_slug is null then 0
          when b.slug <> p_ref_book_slug then 0
          when p_ref_capitulo is null then 500
          when pg.capitulo <> p_ref_capitulo then 0
          when p_ref_versiculo_inicio is null then 700
          when pg.versiculo_inicio is null then 700
          when pg.versiculo_inicio <= coalesce(p_ref_versiculo_fim, p_ref_versiculo_inicio)
            and coalesce(pg.versiculo_fim, pg.versiculo_inicio) >= p_ref_versiculo_inicio
            then 1000
          else 700
        end
      ) as ref_score
      from public.study_passages sp
      join public.passages pg on pg.id = sp.passage_id
      join public.books b on b.id = pg.book_id
      where sp.study_id = base.id
    ) ref on true
    left join lateral (
      select ts_rank(base.busca_texto, websearch_to_tsquery('portuguese', p_texto)) * 100 as text_score
      where p_texto is not null and length(trim(p_texto)) > 0
    ) txt on true
  )
  select
    scored.id,
    scored.slug,
    scored.titulo,
    scored.resumo,
    scored.autor,
    scored.data_origem,
    scored.score,
    count(*) over () as total_count
  from scored
  where scored.score > 0 or p_include_zero_score
  order by scored.score desc, scored.titulo asc
  limit greatest(coalesce(p_limit, 24), 1)
  offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_limit, 24), 1);
$$;

comment on function public.search_studies is 'Fronteira de busca da Fase 2 (SearchRepository). SECURITY INVOKER de propósito: precisa respeitar RLS de public.studies, nunca vazar DRAFT/REVIEW/ARCHIVED.';

grant execute on function public.search_studies to anon, authenticated;
