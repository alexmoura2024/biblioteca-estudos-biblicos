-- Fase 2 — Etapa 4: índices para os filtros públicos do contrato atual.
--
-- Índices de chave única (books.slug, books.ordem_canonica, studies.slug,
-- topics.slug, characters.slug, series.slug, e as PKs compostas das
-- tabelas N:N) já existem implicitamente pelas constraints da migration
-- anterior — não duplicados aqui. Esta migration cobre o que falta para
-- os padrões de consulta do StudyRepository/SearchRepository atuais
-- (src/lib/repositories/types.ts): filtrar por status/visibilidade,
-- listar os mais recentes, e a página de estudo por slug.

-- studies.status: toda leitura pública filtra por status='PUBLISHED'
-- (RLS reforça isso, mas o índice é o que faz o filtro ser rápido).
create index studies_status_idx on public.studies (status);

-- Consulta mais comum da aplicação: estudos publicados e públicos,
-- ordenados por data_origem decrescente (StudyRepository.listRecent) ou
-- filtrados por outros critérios (SearchRepository.search). Índice
-- parcial: só indexa as linhas que a leitura pública pode ver, então
-- fica pequeno mesmo com o acervo real crescendo (a maioria dos estudos
-- em DRAFT/REVIEW não entra aqui).
create index studies_published_public_idx
  on public.studies (data_origem desc)
  where status = 'PUBLISHED' and visibilidade = 'publico';
