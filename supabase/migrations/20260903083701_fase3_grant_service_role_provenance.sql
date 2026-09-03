-- Fase 3 — correção de um achado real: `service_role` não tinha NENHUM
-- GRANT em NENHUMA tabela deste projeto (nem as da Fase 2, como
-- `studies`) neste ambiente Supabase local — confirmado com
-- `curl .../rest/v1/studies` usando a `SECRET_KEY`/`SERVICE_ROLE_KEY`,
-- que devolveu "permission denied for table studies" (SQLSTATE 42501).
-- Isso não é a mesma coisa que "service_role ignora RLS": RLS nem chega
-- a ser avaliada se o GRANT de tabela já bloqueia antes (mesma
-- distinção de DEC-025, camada de GRANT vs. camada de RLS).
--
-- Em produção/hospedado, o Supabase provisiona `service_role` com
-- privilégio total no schema `public` automaticamente; este ambiente
-- local aparentemente não herdou isso para as tabelas criadas por
-- migration. Corrige de uma vez para o schema inteiro (atual e futuro),
-- em vez de tabela por tabela — `service_role` é, por definição
-- (DEC-020, DEC-027), a única role com acesso administrativo total,
-- sempre server-only.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
