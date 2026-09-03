-- Fase 3.1 (checkpoint 15) — suporte a uma DECISÃO EDITORIAL HUMANA rara e
-- explícita: um único arquivo-fonte do Drive contém, na prática, mais de
-- uma mensagem/estudo independente (achado real: SEL-017, "Aniquilará a
-- morte para sempre - Is25.8-9.doc", contém duas mensagens distintas —
-- Isaías 25:8-9 e Lucas 24:18 — concatenadas no mesmo documento). Isto
-- NUNCA é decidido automaticamente pela pipeline determinística
-- (CLAUDE.md §3, DEC-028) — sempre um humano lendo o conteúdo extraído e
-- decidindo explicitamente dividir (ver DEC-042 em docs/DECISIONS.md).
--
-- `files.study_id` continua sendo o vínculo PRIMÁRIO (1:1, usado pela
-- pipeline automática para decidir criar-vs-atualizar) — nunca alterado
-- por esta migration. `study_files` é um vínculo ADICIONAL, explícito e
-- N:N, que registra TODOS os estudos originados de um mesmo arquivo
-- quando (e só quando) uma divisão manual acontece — inclusive o estudo
-- que já está em `files.study_id`, para que uma consulta por
-- "todo estudo vindo deste arquivo" nunca precise conhecer os dois
-- mecanismos separadamente.

create table public.study_files (
  study_id uuid not null references public.studies(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  -- Sempre 'ORIGEM_DIVIDIDA' por enquanto (o único caso real que existe);
  -- texto livre em vez de enum fixo porque é só um rótulo descritivo,
  -- nunca uma condição de negócio verificada em código.
  papel text not null default 'ORIGEM_DIVIDIDA',
  created_at timestamptz not null default now(),

  primary key (study_id, file_id)
);

create index study_files_file_id_idx on public.study_files (file_id);

-- Mesma fronteira de segurança de `files`/`ingestion_jobs` (DEC-020,
-- DEC-027): proveniência nunca é dado público, só `service_role` lê/
-- escreve, sempre server-only (scripts/, nunca src/app/**).
revoke all on public.study_files from public, anon, authenticated;
alter table public.study_files enable row level security;
-- Nenhuma policy criada de propósito — RLS sem policy nega tudo para
-- anon/authenticated em qualquer comando.

-- Novo status de `files.status_processamento`: um arquivo cujo conteúdo
-- foi manualmente dividido em múltiplos estudos por decisão editorial
-- humana. A pipeline automática (`src/lib/ingestion/pipeline.ts`) verifica
-- este status e NUNCA reprocessa um arquivo nesse estado — reprocessar
-- reextrairia o texto INTEIRO (as duas mensagens juntas) e sobrescreveria
-- a divisão humana de volta a um único estudo, apagando a decisão.
alter table public.files drop constraint files_status_processamento_check;
alter table public.files add constraint files_status_processamento_check
  check (status_processamento in (
    'PENDENTE',
    'EXTRAIDO',
    'FALHA_EXTRACAO',
    'NAO_SUPORTADO',
    'PROCESSADO',
    'DIVIDIDO_MANUALMENTE'
  ));
