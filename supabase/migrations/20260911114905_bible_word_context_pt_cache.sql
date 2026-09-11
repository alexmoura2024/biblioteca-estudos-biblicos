create table if not exists public.bible_word_context_pt (
  word_id bigint primary key
    references public.bible_original_words(id) on delete cascade,
  contextual_pt text not null,
  source_contextual text,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bible_word_context_pt enable row level security;

comment on table public.bible_word_context_pt is
  'Cache por ocorrência/palavra da tradução contextual STEPBible para português do Brasil.';
