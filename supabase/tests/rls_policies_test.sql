-- Fase 2 — Etapa 6: testes de RLS (pgTAP). BLOQUEADOR conforme DEC-020 —
-- nenhum acervo real deve ser conectado antes destes testes passarem.
--
-- STATUS: escrito E EXECUTADO com sucesso (`npx supabase db reset` +
-- `npx supabase test db`, ambiente do usuário com Docker disponível —
-- ver docs/WORK_STATUS.md). Nesta sessão de correção, 4 dos 15 asserts
-- originais falhavam (testes 5/6/7/15 — todos usando `throws_ok`) por
-- um erro de USO da função, não por RLS/GRANT incorretos: o Postgres já
-- bloqueava corretamente as escritas com SQLSTATE 42501; o teste é que
-- estava mal formado. Ver a nota "AUDITORIA throws_ok" abaixo.
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
--
-- AUDITORIA throws_ok (correção desta sessão):
-- pgTAP resolve `throws_ok(sql, text, text)` (3 argumentos de texto) de
-- forma AMBÍGUA por heurística: se o 2º argumento "parece" um SQLSTATE
-- (5 caracteres, dígitos/maiúsculas — e '42501' bate nesse padrão), ele
-- assume a forma `throws_ok(sql, errcode, errmsg)` — ou seja, o 3º
-- argumento passa a ser tratado como a MENSAGEM DE ERRO ESPERADA, não
-- como descrição do teste. Era exatamente essa a chamada original aqui
-- (`throws_ok(sql, '42501', 'anon NÃO consegue INSERT em studies')`):
-- o SQLSTATE batia (42501), mas a "mensagem esperada" virava a frase de
-- descrição em português, que nunca bate com a mensagem real do
-- Postgres ("permission denied for table studies") — daí a falha, apesar
-- do bloqueio real ter ocorrido corretamente. Correção: usar sempre a
-- forma explícita de 4 argumentos `throws_ok(sql, errcode, errmsg,
-- description)`, com `errmsg` sendo a mensagem real do Postgres (ou NULL
-- para não checar mensagem, só o código) e a descrição num argumento
-- próprio e inequívoco.
--
-- O QUE REALMENTE BLOQUEIA A ESCRITA (verificado nesta auditoria):
-- a mensagem observada é "permission denied for table studies", que é a
-- mensagem padrão do Postgres para ausência de GRANT na tabela — não
-- "new row violates row-level security policy for table ...", que seria
-- a mensagem de uma policy de escrita efetivamente rejeitando a linha.
-- Isso confirma, junto com a leitura de
-- supabase/migrations/20260903011819_rls_policies.sql (que faz
-- `revoke all ... from public, anon, authenticated` e nunca concede
-- `insert`/`update`/`delete` a `anon`/`authenticated` em nenhuma
-- tabela), que o bloqueio atual acontece na camada de GRANT, antes
-- mesmo de qualquer policy de RLS ser avaliada. Isso é esperado e
-- desejável (defesa em profundidade): mesmo se uma policy de escrita
-- permissiva fosse adicionada por engano no futuro, a ausência do GRANT
-- continuaria bloqueando; e como RLS está habilitada nessas tabelas sem
-- nenhuma policy de INSERT/UPDATE/DELETE para `anon`/`authenticated`,
-- se o GRANT fosse concedido por engano, a política de RLS (que nega
-- por padrão qualquer comando sem policy correspondente) ainda
-- bloquearia a escrita — só que com a outra mensagem. As duas camadas
-- são independentes e cada uma sozinha já impede a escrita hoje.

begin;
select plan(15);

-- ------------------------------------------------------------
-- Fixture: 4 estudos (um por estado editorial), cada um com uma
-- passagem, um tema, um personagem e uma série vinculados — para poder
-- testar que uma relação N:N de um estudo não publicado não vaza
-- e que a de um PUBLISHED continua acessível.
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
  -- testes de vazamento de relação N:N mais adiante.
  perform set_config('rlstest.study_draft', v_study_draft::text, false);
  perform set_config('rlstest.study_published', v_study_published::text, false);
end $$;

-- ============================================================
-- SEGURANÇA DE LEITURA POR RLS — testes 1-4, 9-13
-- Prova que a visibilidade de `studies` (e do que depende dela) segue
-- só o par status/visibilidade, via policy `using (...)`, não GRANT
-- (GRANT select é concedido igualmente a todo estado editorial; quem
-- filtra DRAFT/REVIEW/ARCHIVED é exclusivamente a policy).
-- ============================================================
-- A partir daqui, os testes rodam como `anon` — o papel público que a
-- aplicação usa (src/lib/supabase/client.ts).
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

-- ============================================================
-- SEGURANÇA DE ESCRITA POR GRANT + RLS (defesa em profundidade) —
-- testes 5-7
-- `throws_ok` na forma explícita de 4 argumentos: código esperado
-- ('42501'), mensagem real do Postgres para ausência de GRANT
-- ("permission denied for table studies" — ver nota "O QUE REALMENTE
-- BLOQUEIA A ESCRITA" no cabeçalho), e descrição num argumento à parte.
-- ============================================================

-- 5. anon não consegue INSERT (bloqueado por ausência de GRANT, antes
-- de qualquer policy de RLS ser avaliada)
select throws_ok(
  $$ insert into public.studies (titulo, slug, resumo, conteudo, autor, data_origem)
     values ('hack', '__rlstest__anon-insert', 'r', 'c', 'a', current_date) $$,
  '42501',
  'permission denied for table studies',
  'anon NÃO consegue INSERT em studies (GRANT ausente)'
);

-- 6. anon não consegue UPDATE (mesmo motivo)
select throws_ok(
  $$ update public.studies set titulo = 'hackeado' where slug = '__rlstest__published' $$,
  '42501',
  'permission denied for table studies',
  'anon NÃO consegue UPDATE em studies (GRANT ausente)'
);

-- 7. anon não consegue DELETE (mesmo motivo)
select throws_ok(
  $$ delete from public.studies where slug = '__rlstest__published' $$,
  '42501',
  'permission denied for table studies',
  'anon NÃO consegue DELETE em studies (GRANT ausente)'
);

-- ============================================================
-- De volta à leitura por RLS: vazamento de relação N:N — testes 8-13
-- ============================================================

-- 8-11. relação N:N de um DRAFT não vaza (consultada diretamente na
-- tabela de junção, sem depender de conseguir resolver o id do estudo
-- como anon — usa o id capturado na sessão antes da troca de role).
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

-- 12-13. dados públicos ligados a um PUBLISHED continuam acessíveis
select isnt_empty(
  format($$ select 1 from public.study_topics where study_id = %L $$, current_setting('rlstest.study_published')),
  'study_topics do estudo PUBLISHED continua acessível para anon'
);
select isnt_empty(
  format($$ select 1 from public.passages p join public.study_passages sp on sp.passage_id = p.id where sp.study_id = %L $$, current_setting('rlstest.study_published')),
  'passages do estudo PUBLISHED continuam acessíveis para anon'
);

reset role;

-- ============================================================
-- authenticated comum não ganha privilégio administrativo — testes
-- 14-15. Mesmas restrições de leitura (RLS) e escrita (GRANT + RLS) de
-- anon — não há papel "admin" ainda.
-- ============================================================
set local role authenticated;

-- 14. leitura: mesma restrição de RLS que anon
select is_empty(
  $$ select 1 from public.studies where slug = '__rlstest__draft' $$,
  'authenticated comum também NÃO consegue ler um estudo DRAFT'
);

-- 15. escrita: mesma restrição de GRANT que anon
select throws_ok(
  $$ insert into public.studies (titulo, slug, resumo, conteudo, autor, data_origem)
     values ('hack', '__rlstest__authenticated-insert', 'r', 'c', 'a', current_date) $$,
  '42501',
  'permission denied for table studies',
  'authenticated comum também NÃO consegue INSERT em studies (GRANT ausente)'
);

reset role;

select * from finish();
rollback;
