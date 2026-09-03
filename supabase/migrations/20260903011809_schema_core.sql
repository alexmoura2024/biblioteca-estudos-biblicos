-- Fase 2 — Banco real (Supabase/PostgreSQL), Etapa 3: schema relacional.
--
-- Espelha docs/DATA_MODEL.md e src/lib/types.ts. Cada tabela corresponde
-- a uma entidade já usada pela aplicação (Marco 1/1.1/1.2) contra dados
-- mockados; nenhuma entidade nova é introduzida aqui. Nomes de coluna em
-- português, como o restante do projeto (ver CLAUDE.md §6).
--
-- Relações N:N (study_passages, study_topics, study_characters,
-- study_series) permanecem N:N de propósito — DEC-015 proíbe reduzi-las
-- para 1:N/1:1. RLS é habilitada tabela por tabela na migration
-- 20260903011819_rls_policies.sql (mantida separada da definição do
-- schema para ficar claro que RLS é uma etapa própria, não um detalhe).

create extension if not exists pgcrypto;

-- ============================================================
-- books — os 66 livros do cânon, eixo de indexação da aplicação
-- ============================================================
create table public.books (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  abreviacao text not null,
  -- Não faz parte do DATA_MODEL.md original; usado para roteamento
  -- (/biblia/[livro]) desde o Marco 1 — ver src/lib/types.ts Book.slug.
  slug text not null unique,
  testamento text not null check (testamento in ('AT', 'NT')),
  ordem_canonica smallint not null unique check (ordem_canonica between 1 and 66),
  total_capitulos smallint not null check (total_capitulos > 0),
  created_at timestamptz not null default now()
);

comment on table public.books is 'Os 66 livros do cânon protestante, em ordem canônica. Metadado público e estável.';

-- ============================================================
-- studies — o estudo do acervo; DRAFT/REVIEW/ARCHIVED nunca públicos
-- ============================================================
create table public.studies (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  slug text not null unique,
  resumo text not null,
  conteudo text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED')),
  visibilidade text not null default 'privado'
    check (visibilidade in ('publico', 'privado')),
  autor text not null,
  data_origem date not null,
  palavras_chave text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.studies is 'Um estudo do acervo. Só é publicamente legível quando status=PUBLISHED e visibilidade=publico (ver migration de RLS, DEC-020).';
comment on column public.studies.status is 'Estado editorial: DRAFT (rascunho) -> REVIEW (revisão) -> PUBLISHED (publicado) -> ARCHIVED (arquivado, preservado fora da busca pública). Ver docs/DATA_MODEL.md §3.';

-- updated_at mantido pelo banco, não pela aplicação — evita esquecer de
-- atualizar em algum caminho de escrita futuro.
create function public.set_updated_at() returns trigger
  language plpgsql
  as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger studies_set_updated_at
  before update on public.studies
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- passages — uma passagem bíblica (livro+capítulo[+intervalo de versículo])
-- ============================================================
create table public.passages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  capitulo smallint not null check (capitulo > 0),
  versiculo_inicio smallint check (versiculo_inicio > 0),
  versiculo_fim smallint check (versiculo_fim > 0),
  referencia_normalizada text not null,
  created_at timestamptz not null default now(),
  -- versiculo_fim só faz sentido quando há versiculo_inicio.
  constraint passages_fim_requer_inicio
    check (versiculo_fim is null or versiculo_inicio is not null),
  -- Intervalo nunca invertido (mesma regra do parser em
  -- src/lib/search/referenceParser.ts — reforçada aqui no banco).
  constraint passages_fim_maior_ou_igual_inicio
    check (versiculo_fim is null or versiculo_fim >= versiculo_inicio)
);

comment on table public.passages is 'Uma passagem bíblica citada por ao menos um estudo. Sem versiculo_inicio, representa o capítulo inteiro.';

create index passages_book_id_idx on public.passages (book_id);
create index passages_book_id_capitulo_idx on public.passages (book_id, capitulo);

-- ============================================================
-- study_passages — N:N estudo↔passagem, com tipo de relação e prioridade
-- ============================================================
create table public.study_passages (
  study_id uuid not null references public.studies (id) on delete cascade,
  passage_id uuid not null references public.passages (id) on delete cascade,
  tipo_relacao text not null default 'MAIN'
    check (tipo_relacao in ('MAIN', 'SECONDARY', 'CITED')),
  prioridade smallint not null default 1,
  primary key (study_id, passage_id)
);

comment on table public.study_passages is 'Relação N:N: um estudo pode ter várias passagens (livros diferentes inclusive); uma passagem pode ser citada por vários estudos. Nunca reduzir para 1:N (DEC-015).';
comment on column public.study_passages.tipo_relacao is 'MAIN = passagem principal do estudo, SECONDARY = secundária, CITED = citada de passagem. Corresponde a TipoRelacaoPassagem em src/lib/types.ts (principal/secundaria/citada) — mapeado pelo repositório Supabase, ver src/lib/repositories/supabase/mappers.ts.';

-- Garante uma referência principal previsível: no máximo uma passagem
-- MAIN por estudo (índice único parcial). Um estudo pode não ter
-- nenhuma MAIN definida (a aplicação já trata isso com fallback para a
-- primeira passagem — ver toStudySummary em src/lib/repositories/mock.ts
-- e a mesma regra no repositório Supabase), mas nunca pode ter duas.
create unique index study_passages_one_main_per_study_idx
  on public.study_passages (study_id)
  where tipo_relacao = 'MAIN';

create index study_passages_passage_id_idx on public.study_passages (passage_id);

-- ============================================================
-- topics — temas
-- ============================================================
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text not null default '',
  created_at timestamptz not null default now()
);

create table public.study_topics (
  study_id uuid not null references public.studies (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  peso smallint not null default 1,
  primary key (study_id, topic_id)
);

comment on table public.study_topics is 'Relação N:N estudo↔tema. Nunca reduzir para 1:N (DEC-015).';
create index study_topics_topic_id_idx on public.study_topics (topic_id);

-- ============================================================
-- characters — personagens bíblicos
-- ============================================================
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text not null default '',
  created_at timestamptz not null default now()
);

create table public.study_characters (
  study_id uuid not null references public.studies (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  papel text not null default 'mencionado',
  primary key (study_id, character_id)
);

comment on table public.study_characters is 'Relação N:N estudo↔personagem. Nunca reduzir para 1:N (DEC-015).';
create index study_characters_character_id_idx on public.study_characters (character_id);

-- ============================================================
-- series — séries de estudos
-- ============================================================
create table public.series (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text not null default '',
  created_at timestamptz not null default now()
);

create table public.study_series (
  study_id uuid not null references public.studies (id) on delete cascade,
  series_id uuid not null references public.series (id) on delete cascade,
  ordem smallint not null default 1,
  primary key (study_id, series_id)
);

comment on table public.study_series is 'Relação N:N estudo↔série — um estudo pode pertencer a várias séries (prova em DEC-015/estudo multi-passagem do Marco 1.1). Nunca reduzir para 1:N.';
create index study_series_series_id_idx on public.study_series (series_id);
create index study_series_series_id_ordem_idx on public.study_series (series_id, ordem);
