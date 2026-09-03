-- Fase 3 — Etapa 2: modelo de proveniência (docs/DATA_MODEL.md §2 "files",
-- docs/INGESTION_SPEC.md §5). Um arquivo do Drive é origem de um estudo,
-- nunca a entidade principal (DATA_MODEL.md §4) — por isso study_id é
-- nullable: um arquivo pode existir (registrado, extraído) antes de um
-- `study` ser criado/vinculado a ele, e a ingestão preenche esse vínculo
-- depois. Nenhuma linha desta tabela é lida pela aplicação pública — ver
-- a migration de RLS logo em seguida (..._fase3_provenance_rls.sql):
-- `files`/`ingestion_jobs` ficam totalmente bloqueadas para `anon`/
-- `authenticated`, só acessíveis via `service_role` (script de ingestão,
-- server-only — nunca no browser, DEC-020).

create table public.files (
  id uuid primary key default gen_random_uuid(),

  -- Identificação/rastreabilidade da origem (INGESTION_SPEC.md §5).
  -- UNIQUE evita ingestão duplicada acidental do mesmo arquivo do Drive
  -- (reprocessar não deve poder criar uma segunda linha para o mesmo
  -- drive_file_id — ver a lógica idempotente em src/lib/ingestion/).
  drive_file_id text not null unique,
  nome_original text not null,
  mime_type text not null,
  drive_url text not null,

  -- Nem sempre disponível no momento do registro (ex.: antes da extração
  -- calcular o hash do conteúdo já extraído) — por isso nullable.
  hash_conteudo text,
  -- Corresponde ao "versao" de DATA_MODEL.md: comparar modified_time
  -- contra o valor já registrado é como a ingestão decide se um arquivo
  -- mudou no Drive e precisa ser reprocessado (INGESTION_SPEC.md §9).
  modified_time timestamptz,
  tamanho_bytes bigint,

  -- Um `study` pode não existir ainda (arquivo cujo processamento falhou
  -- antes de chegar à criação do estudo) — nunca obrigatório na origem.
  study_id uuid references public.studies(id) on delete set null,

  status_processamento text not null default 'PENDENTE'
    check (status_processamento in (
      'PENDENTE',        -- registrado, ainda não processado
      'EXTRAIDO',        -- texto extraído com sucesso
      'FALHA_EXTRACAO',  -- extração tentada e falhou (formato corrompido, vazio, etc.)
      'NAO_SUPORTADO',   -- formato ainda sem adaptador de extração (INGESTION_SPEC.md §4)
      'PROCESSADO'       -- pipeline completo: study em DRAFT/REVIEW criado/atualizado
    )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger files_set_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

create index files_study_id_idx on public.files (study_id);
create index files_status_processamento_idx on public.files (status_processamento);
