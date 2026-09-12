-- Contador de visitantes únicos por navegador.
-- Nenhum IP, nome ou e-mail é armazenado.
-- A tabela é acessada somente pelo service_role através da API do Next.js.

create table if not exists public.site_visitors (
  visitor_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists site_visitors_last_seen_idx
  on public.site_visitors (last_seen desc);

alter table public.site_visitors enable row level security;

revoke all on table public.site_visitors from anon;
revoke all on table public.site_visitors from authenticated;

grant select, insert, update, delete
  on table public.site_visitors
  to service_role;
