-- Dedicated approved Majlis project only. Not executed on the shared-list database.
begin;
create table public.majlis_dev_reports (
 id text primary key check (id ~ '^[a-f0-9]{32}$'),
 created_at timestamptz not null default now(),
 version text not null check (length(version)<=15),
 report jsonb not null check (octet_length(report::text)<=16000)
);
alter table public.majlis_dev_reports enable row level security;
revoke all on public.majlis_dev_reports from public, anon, authenticated;
grant select, insert, delete on public.majlis_dev_reports to service_role;
create index majlis_dev_reports_created on public.majlis_dev_reports(created_at desc);
-- Single write token; serialize quotas and duplicate detection in one transaction.
create function public.majlis_accept_report(p_report jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare old_report jsonb; report_id text := p_report->>'id'; report_version text := p_report->>'version';
begin
 if report_id is null or report_id !~ '^[a-f0-9]{32}$' or report_version is null or report_version !~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(\.[0-9]{1,3})?$' or octet_length(p_report::text)>16000 then
  return 'invalid';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(24783301);
 delete from public.majlis_dev_reports where created_at < now() - interval '30 days';
 select report into old_report from public.majlis_dev_reports where id=report_id;
 if found then if old_report=p_report then return 'duplicate'; else return 'conflict'; end if; end if;
 if (select count(*) from public.majlis_dev_reports where created_at>=now()-interval '1 hour')>=30 or
    (select count(*) from public.majlis_dev_reports where created_at>=now()-interval '1 day')>=200 then return 'rate_limited'; end if;
 insert into public.majlis_dev_reports(id,version,report) values(report_id,report_version,p_report);
 return 'accepted';
end;
$$;
revoke all on function public.majlis_accept_report(jsonb) from public, anon, authenticated;
grant execute on function public.majlis_accept_report(jsonb) to service_role;
commit;
-- Expired reports are purged on authorized writes. Schedule an admin cleanup separately
-- if strict 30-day deletion is required even when no reports arrive.
