-- Apply only to a dedicated approved Majlis project, not the existing shared-list database.
create table public.majlis_dev_reports (
 id text primary key check (id ~ '^[a-f0-9]{32}$'),
 created_at timestamptz not null default now(),
 version text not null check (length(version)<=15),
 report jsonb not null check (octet_length(report::text)<=16000)
);
alter table public.majlis_dev_reports enable row level security;
revoke all on public.majlis_dev_reports from public, anon, authenticated;
grant select, insert on public.majlis_dev_reports to service_role;
create index majlis_dev_reports_created on public.majlis_dev_reports(created_at desc);
-- Admin-only maintenance (schedule separately after deployment):
-- delete from public.majlis_dev_reports where created_at < now() - interval '30 days';
