-- Fase 3 — segurança das tabelas de proveniência (DEC-020, mesma política
-- registrada antes da Fase 2). `files`/`ingestion_jobs` NUNCA são dados
-- públicos: nome de arquivo, URL do Drive, estágio/erro de ingestão e o
-- vínculo com um `study` ainda não publicado são metadados editoriais/
-- operacionais. Diferente de books/topics/characters/series (públicos
-- por natureza), aqui não existe nenhuma policy de SELECT para `anon`/
-- `authenticated` — RLS habilitada sem nenhuma policy é "nega tudo por
-- padrão" para essas roles. Só `service_role` (que ignora RLS por
-- padrão na plataforma) lê/escreve estas tabelas, e só a partir de
-- código server-only (script de ingestão) — nunca do browser, nunca da
-- interface pública. Ver src/lib/supabase/serviceClient.ts.

revoke all on public.files, public.ingestion_jobs from public, anon, authenticated;

alter table public.files enable row level security;
alter table public.ingestion_jobs enable row level security;

-- Nenhuma policy é criada de propósito: sem policy, RLS nega toda linha
-- para anon/authenticated em qualquer comando (SELECT/INSERT/UPDATE/
-- DELETE). Não crie uma policy "temporária" aqui para depurar — use o
-- client de service_role em vez disso.
