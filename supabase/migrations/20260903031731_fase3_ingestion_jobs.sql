-- Fase 3 — Etapa 3: log de execução da ingestão (INGESTION_SPEC.md §10).
-- Cada estágio do pipeline (src/lib/ingestion/pipeline.ts) grava uma
-- linha aqui — não uma linha por arquivo, mas uma por (arquivo, estágio,
-- tentativa), para que uma sessão futura consiga saber exatamente onde
-- um arquivo parou e por quê, sem depender do histórico da conversa
-- (INGESTION_SPEC.md §10, "suficiente para retomada").

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,

  stage text not null check (stage in (
    'FETCH',                -- obter o arquivo na origem (Drive)
    'EXTRACT',               -- extrair texto do formato original
    'NORMALIZE',              -- normalizar texto extraído
    'REFERENCE_DETECTION',    -- detectar/validar referências bíblicas
    'METADATA_SUGGESTION',    -- sugerir tema/personagem/série/resumo
    'DUPLICATE_CHECK',        -- diagnosticar possível duplicidade
    'UPSERT_STUDY'            -- criar/atualizar o study (sempre DRAFT/REVIEW)
  )),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED')),
  attempt integer not null default 1 check (attempt > 0),
  error_message text,

  started_at timestamptz,
  finished_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ingestion_jobs_set_updated_at
  before update on public.ingestion_jobs
  for each row execute function public.set_updated_at();

create index ingestion_jobs_file_id_idx on public.ingestion_jobs (file_id);
create index ingestion_jobs_status_idx on public.ingestion_jobs (status);
