-- Administrator / authorized connector only; no public endpoint.
-- Read most recent 20 reports, without revealing secrets.
select id, created_at, version, jsonb_array_length(report->'events') as events
from public.majlis_dev_reports order by created_at desc limit 20;
-- Aggregate technical events, recent seven days.
select e->>'kind' as event_kind, count(*) as count
from public.majlis_dev_reports r cross join lateral jsonb_array_elements(r.report->'events') e
where r.created_at>=now()-interval '7 days'
group by 1 order by 2 desc;
-- Per-broker latency (a=broker ordinal, b=median RTT in ms, c=lost probes).
select e->>'a' as broker_index, count(*) as samples,
 round(avg((e->>'b')::numeric),1) as mean_reported_rtt_ms,
 sum((e->>'c')::int) as lost_probes
from public.majlis_dev_reports r cross join lateral jsonb_array_elements(r.report->'events') e
where r.created_at>=now()-interval '7 days' and e->>'kind'='broker'
group by 1 order by 1;
-- Canvas: a=height, b=FPS*10, c=P95 frame time in ms*10.
select e->>'a' as height_px, count(*) as samples,
 round(avg((e->>'b')::numeric)/10,1) as mean_fps,
 round(avg((e->>'c')::numeric)/10,1) as mean_reported_p95_ms
from public.majlis_dev_reports r cross join lateral jsonb_array_elements(r.report->'events') e
where e->>'kind'='canvas' and r.created_at>=now()-interval '7 days'
group by 1 order by 1;
