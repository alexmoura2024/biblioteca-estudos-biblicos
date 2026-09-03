-- Histórico simples de edições editoriais
-- Preserva snapshots antes de sobrescrita
create table public.study_edits (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete cascade,
  titulo_anterior text,
  resumo_anterior text,
  conteudo_anterior text,
  campos_alterados text[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.study_edits is 'Histórico editorial: snapshots de alterações editoriais com versionamento simples';

create index study_edits_study_id_idx on public.study_edits(study_id);
create index study_edits_created_at_idx on public.study_edits(created_at desc);

-- RLS: bloquear acesso público (dados administrativos)
alter table public.study_edits enable row level security;
revoke all on public.study_edits from public, anon, authenticated;
