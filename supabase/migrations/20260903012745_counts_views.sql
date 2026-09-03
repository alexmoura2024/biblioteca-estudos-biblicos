-- Fase 2 — Etapa 8/9 apoio: agregações dedicadas para
-- TopicRepository/CharacterRepository/SeriesRepository.countPublishedStudies()
-- (src/lib/repositories/types.ts), a implementação real de "SELECT
-- <fk>, COUNT(DISTINCT study_id) ... GROUP BY <fk>" já prometida no
-- contrato desde o Marco 1.2 (DEC-018).
--
-- `security_invoker = true` é essencial aqui: sem isso, uma view roda
-- com os privilégios do dono (postgres), o que ignoraria a RLS de
-- `studies` e contaria estudos DRAFT/REVIEW/ARCHIVED também — o mesmo
-- erro de vazamento que DEC-020 proíbe, só que através de uma view em
-- vez de uma tabela. Com security_invoker, a view aplica a RLS de quem
-- a está consultando (anon/authenticated), então só PUBLISHED+publico
-- entra na contagem.

create view public.topic_study_counts
  with (security_invoker = true)
  as
  select st.topic_id, count(distinct st.study_id) as total
  from public.study_topics st
  join public.studies s on s.id = st.study_id
  where s.status = 'PUBLISHED' and s.visibilidade = 'publico'
  group by st.topic_id;

create view public.character_study_counts
  with (security_invoker = true)
  as
  select sc.character_id, count(distinct sc.study_id) as total
  from public.study_characters sc
  join public.studies s on s.id = sc.study_id
  where s.status = 'PUBLISHED' and s.visibilidade = 'publico'
  group by sc.character_id;

create view public.series_study_counts
  with (security_invoker = true)
  as
  select ss.series_id, count(distinct ss.study_id) as total
  from public.study_series ss
  join public.studies s on s.id = ss.study_id
  where s.status = 'PUBLISHED' and s.visibilidade = 'publico'
  group by ss.series_id;

grant select on public.topic_study_counts to anon, authenticated;
grant select on public.character_study_counts to anon, authenticated;
grant select on public.series_study_counts to anon, authenticated;
