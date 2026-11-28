-- Applied to dedicated Majlis TV Analytics project only.
begin;
create schema majlis_private;
revoke all on schema majlis_private from public, anon, authenticated;
grant usage on schema majlis_private to service_role;
create table majlis_private.write_key (
 singleton boolean primary key default true check(singleton),
 digest bytea not null check(octet_length(digest)=32)
);
alter table majlis_private.write_key enable row level security;
revoke all on majlis_private.write_key from public, anon, authenticated;
grant select on majlis_private.write_key to service_role;
create function public.majlis_authorize_report(p_digest text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from majlis_private.write_key where encode(digest,'hex')=p_digest);
$$;
revoke all on function public.majlis_authorize_report(text) from public, anon, authenticated;
grant execute on function public.majlis_authorize_report(text) to service_role;
commit;
-- Generate and rotate in an authorized SQL session; never commit returned plaintext.
-- with k as materialized (select replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') as token)
-- , put as (insert into majlis_private.write_key(singleton,digest) select true,sha256(convert_to(token,'UTF8')) from k on conflict(singleton) do update set digest=excluded.digest returning singleton)
-- select token from k cross join put;
