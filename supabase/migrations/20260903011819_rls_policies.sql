-- Fase 2 — Etapa 5: segurança / RLS. BLOQUEADOR — DEC-020.
--
-- Regra central: `anon` e `authenticated` só enxergam estudos com
-- status='PUBLISHED' e visibilidade='publico'; DRAFT/REVIEW/ARCHIVED
-- nunca são publicamente legíveis, nem diretamente (tabela studies) nem
-- indiretamente através de uma tabela de relacionamento (study_passages,
-- study_topics, study_characters, study_series) ou de uma tabela
-- referenciada só por eles (passages usadas só por um DRAFT).
--
-- Nenhuma escrita pública: não existe nenhuma policy de INSERT/UPDATE/
-- DELETE para `anon` nem `authenticated` neste arquivo, e nenhum GRANT
-- dessas operações é concedido a essas roles — as duas camadas (grant e
-- policy) bloqueiam escrita, não apenas uma. `service_role` ignora RLS
-- por padrão na plataforma Supabase (não é algo configurado aqui) e só
-- deve ser usado em código server-only — ver src/lib/supabase/client.ts
-- e docs/DECISIONS.md (DEC-020).
--
-- `authenticated` recebe exatamente o mesmo acesso de leitura que
-- `anon` nesta fase — não há usuários "administradores" ainda
-- (autenticação pública e painel administrativo são explicitamente
-- fora de escopo da Fase 2, ver docs/WORK_STATUS.md).

-- Reforça que nem PUBLIC nem as roles de dados têm privilégio implícito
-- nestas tabelas antes de concedermos explicitamente o que é necessário.
revoke all on
  public.books, public.studies, public.passages, public.study_passages,
  public.topics, public.study_topics, public.characters,
  public.study_characters, public.series, public.study_series
from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- ============================================================
-- RLS habilitada em toda tabela exposta (nenhuma exceção)
-- ============================================================
alter table public.books enable row level security;
alter table public.studies enable row level security;
alter table public.passages enable row level security;
alter table public.study_passages enable row level security;
alter table public.topics enable row level security;
alter table public.study_topics enable row level security;
alter table public.characters enable row level security;
alter table public.study_characters enable row level security;
alter table public.series enable row level security;
alter table public.study_series enable row level security;

-- Nenhuma tabela recebe FORCE ROW LEVEL SECURITY porque não há
-- necessidade de restringir o dono/superusuário aqui (migrations e
-- seed rodam como owner); RLS já se aplica integralmente a anon/
-- authenticated, que é a única fronteira que importa nesta fase.

-- ============================================================
-- Metadados públicos: livros, temas, personagens, séries
-- ============================================================
-- Não têm estado editorial (DRAFT/REVIEW/...) — são sempre públicos.
grant select on public.books to anon, authenticated;
create policy books_public_select on public.books
  for select to anon, authenticated
  using (true);

grant select on public.topics to anon, authenticated;
create policy topics_public_select on public.topics
  for select to anon, authenticated
  using (true);

grant select on public.characters to anon, authenticated;
create policy characters_public_select on public.characters
  for select to anon, authenticated
  using (true);

grant select on public.series to anon, authenticated;
create policy series_public_select on public.series
  for select to anon, authenticated
  using (true);

-- ============================================================
-- studies: só PUBLISHED + publico
-- ============================================================
grant select on public.studies to anon, authenticated;
create policy studies_public_select on public.studies
  for select to anon, authenticated
  using (status = 'PUBLISHED' and visibilidade = 'publico');

-- ============================================================
-- passages: só visível se citada por ao menos um estudo público
-- ============================================================
-- Uma passagem citada apenas por um DRAFT (e por nenhum estudo
-- publicado) não deve aparecer — daí o EXISTS contra study_passages+
-- studies, em vez de uma policy "using (true)".
grant select on public.passages to anon, authenticated;
create policy passages_public_select on public.passages
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.study_passages sp
      join public.studies s on s.id = sp.study_id
      where sp.passage_id = passages.id
        and s.status = 'PUBLISHED'
        and s.visibilidade = 'publico'
    )
  );

-- ============================================================
-- Tabelas de relacionamento N:N: nunca revelam um estudo não publicado
-- ============================================================
grant select on public.study_passages to anon, authenticated;
create policy study_passages_public_select on public.study_passages
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.studies s
      where s.id = study_passages.study_id
        and s.status = 'PUBLISHED'
        and s.visibilidade = 'publico'
    )
  );

grant select on public.study_topics to anon, authenticated;
create policy study_topics_public_select on public.study_topics
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.studies s
      where s.id = study_topics.study_id
        and s.status = 'PUBLISHED'
        and s.visibilidade = 'publico'
    )
  );

grant select on public.study_characters to anon, authenticated;
create policy study_characters_public_select on public.study_characters
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.studies s
      where s.id = study_characters.study_id
        and s.status = 'PUBLISHED'
        and s.visibilidade = 'publico'
    )
  );

grant select on public.study_series to anon, authenticated;
create policy study_series_public_select on public.study_series
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.studies s
      where s.id = study_series.study_id
        and s.status = 'PUBLISHED'
        and s.visibilidade = 'publico'
    )
  );

-- ============================================================
-- Nada além disso: sem policies de INSERT/UPDATE/DELETE para anon ou
-- authenticated. Sem GRANT de INSERT/UPDATE/DELETE para essas roles
-- (a instrução `revoke all` no topo deste arquivo já garante isso; não
-- há nenhum `grant insert/update/delete` em lugar nenhum desta
-- migration). Uma tentativa de escrita como anon/authenticated falha na
-- checagem de GRANT antes mesmo de qualquer policy ser avaliada.
-- ============================================================
