-- Bíblia ACF para uso pessoal/privado.
-- O texto integral NÃO fica no repositório da aplicação.
-- Ele é importado separadamente para o Supabase pelo script
-- `npm run bible:import-acf`.
--
-- As tabelas ficam com RLS habilitada e sem policy pública.
-- A aplicação lê o texto somente no servidor usando service role.

create table if not exists public.bible_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  language text not null default 'pt-BR',
  source_repo text not null,
  source_path text not null,
  source_ref text not null default 'master',
  private_use_only boolean not null default true,
  copyright_notice text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bible_verses (
  version_id uuid not null references public.bible_versions(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter smallint not null check (chapter > 0),
  verse smallint not null check (verse > 0),
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (version_id, book_id, chapter, verse)
);

create index if not exists bible_verses_book_chapter_idx
  on public.bible_verses (book_id, chapter, verse);

create index if not exists bible_verses_version_book_idx
  on public.bible_verses (version_id, book_id);

alter table public.bible_versions enable row level security;
alter table public.bible_verses enable row level security;

comment on table public.bible_versions is
  'Metadados de versões bíblicas importadas para uso privado do proprietário da biblioteca.';

comment on table public.bible_verses is
  'Texto bíblico por versículo. Sem policy pública: leitura feita no servidor com service role.';

comment on column public.bible_versions.private_use_only is
  'Versão importada para uso pessoal/privado; não implica licença de redistribuição.';
