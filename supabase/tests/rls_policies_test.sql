-- Fase 2 — Etapa 6: testes de RLS (pgTAP). BLOQUEADOR conforme DEC-020 —
-- nenhum acervo real deve ser conectado antes destes testes passarem.
--
-- STATUS DESTA SESSÃO: escrito, mas NÃO EXECUTADO. `supabase test db`
-- precisa de Docker (Postgres local do Supabase roda em container) e
-- Docker não está disponível nesta máquina/ambiente — ver o bloqueio
-- registrado em docs/WORK_STATUS.md (Fase 2, Etapa 2/6). Isto NÃO deve
-- ser lido como "os testes passaram"; é a especificação executável dos
-- 10 cenários pedidos, pronta para rodar (`supabase test db`) assim que
-- Docker estiver disponível. Ver também o relatório final da Fase 2.
--
-- Cobre os 10 cenários exigidos: anon lê PUBLISHED; anon não lê DRAFT/
-- REVIEW/ARCHIVED; anon não insere/atualiza/apaga; authenticated comum
-- não ganha privilégio administrativo; uma relação N:N de um estudo não
-- publicado não vaza; dados públicos ligados a um PUBLISHED continuam
-- acessíveis.
--
-- Fixtures próprias (com o prefixo "__rlstest__" em slug/titulo), em vez
-- de depender dos dados de supabase/seed.sql — assim este teste continua
-- correto mesmo que o seed mude, e cobre também ARCHIVED (que o seed
-- atual não usa). Toda a fixture é criada dentro da transação e desfeita
-- pelo ROLLBACK final; nada disto fica no banco depois do teste.

begin;
select plan(15);

-- ------------------------------------------------------------
-- Fixture: 4 estudos (um por estado editorial), cada um com uma
-- passagem, um tema, um personagem e uma série vinculados — para poder
-- testar que uma relação N:N de um estudo não publicado não vaza
-- (cenário 9) e que a de um PUBLISHED continua acessível (cenário 10).
-- Roda como o role que executa o teste (postgres/dono das tabelas —
-- RLS não se aplica ao dono por padrão), então estas instruções sempre
-- têm efeito independentemente das policies sendo testadas depois.
-- ------------------------------------------------------------
do $$
declare
  v_book_id uuid;
  v_topic_id uuid;
  v_character_id uuid;
  v_series_id uuid;
  v_passage_id uuid;
  v_study_draft uuid;
  v_study_review uuid;
  v_study_published uuid;
  v_study_archived uuid;
begin
  select id into v_book_id from public.books limit 1;
  select id into v_topic_id from public.topics limit 1;
  select id into v_character_id from public.characters limit 1;
  select id into v_series_id from public.series limit 1;

  insert into public.studies (titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem)
    values ('__rlstest__ draft', '__rlstest__draft', 'r', 'c', 'DRAFT', 'publico', 'a', current_date)
    returning id into v_study_draft;
  insert into public.studies (titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem)
    values ('__rlstest__ review', '__rlstest__review', 'r', 'c', 'REVIEW', 'publico', 'a', current_date)
    returning id into v_study_review;
  insert into public.studies (titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem)
    values ('__rlstest__ published', '__rlstest__published', 'r', 'c', 'PUBLISHED', 'publico', 'a', current_date)
    returning id into v_study_published;
  insert into public.studies (titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem)
    values ('__rlstest__ archived', '__rlstest__archived', 'r', 'c', 'ARCHIVED', 'publico', 'a', current_date)
    returning id into v_study_archived;

  insert into public.passages (book_id, capitulo, referencia_normalizada)
    values (v_book_id, 1, '__rlstest__ passage')
    returning id into v_passage_id;

  insert into public.study_passages (study_id, passage_id, tipo_relacao) values
    (v_study_draft, v_passage_id, 'MAIN'),
    (v_study_review, v_passage_id, 'MAIN'),
    (v_study_published, v_passage_id, 'MAIN'),
    (v_study_archived, v_passage_id, 'MAIN');
  insert into public.study_topics (study_id, topic_id) values
    (v_study_draft, v_topic_id), (v_study_review, v_topic_id),
    (v_study_published, v_topic_id), (v_study_archived, v_topic_id);
  insert into public.study_characters (study_id, character_id) values
    (v_study_draft, v_character_id), (v_study_review, v_character_id),
    (v_study_published, v_character_id), (v_study_archived, v_character_id);
  insert into public.study_series (study_id, series_id) values
    (v_study_draft, v_series_id), (v_study_review, v_series_id),
    (v_study_published, v_series_id), (v_study_archived, v_series_id);

  -- Guarda os ids em variáveis de sessão (sobrevivem à troca de ROLE
  -- abaixo, ao contrário das variáveis locais deste bloco DO) para os
  -- cenários 9/10 mais adiante.
  perform set_config('rlstest.study_draft', v_study_draft::text, false);
  perform set_config('rlstest.study_published', v_study_published::text, false);
end $$;

-- ------------------------------------------------------------
-- A partir daqui, os testes rodam como `anon` — o papel público que a
-- aplicação usa (src/lib/supabase/client.ts).
-- ------------------------------------------------------------
set local role anon;

-- 1. anon consegue ler estudo PUBLISHED
select isnt_empty(
  $$ select 1 from public.studies where slug = '__rlstest__published' $$,
  'anon consegue ler um estudo PUBLISHED'
);

-- 2. anon NÃO consegue ler DRAFT
select is_empty(
  $$ select 1 from public.studies where slug = '__rlstest__draft' $$,
  'anon NÃO consegue ler um estudo DRAFT'
);

-- 3. anon NÃO consegue ler REVIEW
select is_empty(
  $$ select 1 from public.studies where slug = '__rlstest__review' $$,
  'anon NÃO consegue ler um estudo REVIEW'
);

-- 4. anon NÃO consegue ler ARCHIVED
select is_empty(
  $$ select 1 from public.studies where slug = '__rlstest__archived' $$,
  'anon NÃO consegue ler um estudo ARCHIVED'
);

-- 5. anon não consegue INSERT
select throws_ok(
  $$ insert into public.studies (titulo, slug, resumo, conteudo, autor, data_origem)
     values ('hack', '__rlstest__anon-insert', 'r', 'c', 'a', current_date) $$,
  '42501',
  'anon NÃO consegue INSERT em studies'
);

-- 6. anon não consegue UPDATE
select throws_ok(
  $$ update public.studies set titulo = 'hackeado' where slug = '__rlstest__published' $$,
  '42501',
  'anon NÃO consegue UPDATE em studies'
);

-- 7. anon não consegue DELETE
select throws_ok(
  $$ delete from public.studies where slug = '__rlstest__published' $$,
  '42501',
  'anon NÃO consegue DELETE em studies'
);

-- 9. relação N:N de um DRAFT não vaza (consultada diretamente na tabela
-- de junção, sem depender de conseguir resolver o id do estudo como
-- anon — usa o id capturado na sessão antes da troca de role).
select is_empty(
  format($$ select 1 from public.study_topics where study_id = %L $$, current_setting('rlstest.study_draft')),
  'study_topics do estudo DRAFT não vaza para anon'
);
select is_empty(
  format($$ select 1 from public.study_passages where study_id = %L $$, current_setting('rlstest.study_draft')),
  'study_passages do estudo DRAFT não vaza para anon'
);
select is_empty(
  format($$ select 1 from public.study_characters where study_id = %L $$, current_setting('rlstest.study_draft')),
  'study_characters do estudo DRAFT não vaza para anon'
);
select is_empty(
  format($$ select 1 from public.study_series where study_id = %L $$, current_setting('rlstest.study_draft')),
  'study_series do estudo DRAFT não vaza para anon'
);

-- 10. dados públicos ligados a um PUBLISHED continuam acessíveis
select isnt_empty(
  format($$ select 1 from public.study_topics where study_id = %L $$, current_setting('rlstest.study_published')),
  'study_topics do estudo PUBLISHED continua acessível para anon'
);
select isnt_empty(
  format($$ select 1 from public.passages p join public.study_passages sp on sp.passage_id = p.id where sp.study_id = %L $$, current_setting('rlstest.study_published')),
  'passages do estudo PUBLISHED continuam acessíveis para anon'
);

reset role;

-- ------------------------------------------------------------
-- 8. authenticated comum não ganha privilégio administrativo — mesmas
-- restrições de leitura/escrita de anon (não há papel "admin" ainda).
-- ------------------------------------------------------------
set local role authenticated;

select is_empty(
  $$ select 1 from public.studies where slug = '__rlstest__draft' $$,
  'authenticated comum também NÃO consegue ler um estudo DRAFT'
);
select throws_ok(
  $$ insert into public.studies (titulo, slug, resumo, conteudo, autor, data_origem)
     values ('hack', '__rlstest__authenticated-insert', 'r', 'c', 'a', current_date) $$,
  '42501',
  'authenticated comum também NÃO consegue INSERT em studies'
);

reset role;

select * from finish();
rollback;
