create table if not exists public.bible_strong_meanings_pt (
  strong text primary key,
  meaning_pt text not null,
  source_gloss text,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bible_strong_meanings_pt enable row level security;

comment on table public.bible_strong_meanings_pt is
  'Cache por numero Strong de tradução concisa da glosa lexical STEPBible para português do Brasil, gerada sob demanda.';
