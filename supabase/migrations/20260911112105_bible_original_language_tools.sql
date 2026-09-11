-- Bíblia Inteligente v1 — dados originais + cache de IA contextual.
-- Dados linguísticos: STEPBible / Tyndale House, CC BY 4.0.
-- As tabelas não possuem policy pública; a aplicação consulta via service role no servidor.

create table if not exists public.bible_original_words (
  id bigint generated always as identity primary key,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter smallint not null check (chapter > 0),
  verse smallint not null check (verse > 0),
  position smallint not null check (position > 0),
  language text not null check (language in ('he','grc')),
  surface text not null,
  transliteration text,
  lemma text,
  strong text,
  strong_extended text,
  morphology text,
  gloss text,
  contextual_translation text,
  is_proper_name boolean not null default false,
  source text not null default 'STEPBible',
  source_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, chapter, verse, position, language)
);

create index if not exists bible_original_words_reference_idx
  on public.bible_original_words (book_id, chapter, verse, position);

create index if not exists bible_original_words_strong_idx
  on public.bible_original_words (strong)
  where strong is not null;

create index if not exists bible_original_words_lemma_idx
  on public.bible_original_words (lemma)
  where lemma is not null;

create table if not exists public.bible_lexical_explanations (
  word_id bigint primary key
    references public.bible_original_words(id) on delete cascade,
  explanation text not null,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bible_original_words enable row level security;
alter table public.bible_lexical_explanations enable row level security;

comment on table public.bible_original_words is
  'Dados linguísticos hebraicos e gregos derivados do STEPBible/Tyndale House, CC BY 4.0.';

comment on table public.bible_lexical_explanations is
  'Cache de explicações lexicais contextuais geradas sob demanda para reduzir custo de IA.';
