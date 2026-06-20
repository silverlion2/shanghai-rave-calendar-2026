create or replace view public.poster_wall_cards
with (security_invoker = true)
as
select
  e.id,
  e.slug,
  e.title,
  coalesce(nullif(e.city, ''), 'Shanghai') as city,
  e.country,
  e.date_label,
  e.sort_date,
  e.time_label,
  e.venue_name,
  e.district,
  e.sound,
  e.genre,
  e.status,
  e.confidence,
  e.price,
  e.age,
  e.description,
  e.notes,
  coalesce(e.raw->>'ticketUrl', e.raw->>'ticket_url') as ticket_url,
  coalesce(e.raw->>'ticketStatus', e.raw->>'ticket_status') as ticket_status,
  e.source_url,
  e.source_label,
  e.source_status,
  e.last_checked,
  e.event_url,
  coalesce(p.image->>'display', p.image->>'thumbnail', e.poster_url) as poster_display_url,
  coalesce(p.image->>'thumbnail', p.image->>'display', e.poster_url) as poster_thumbnail_url,
  coalesce(p.image->>'sourceAsset', e.poster_url) as poster_source_url,
  e.image_theme,
  e.vibe,
  e.tags,
  e.sources,
  e.lineup,
  e.set_times,
  e.raw,
  p.id as poster_archive_id,
  p.collection as poster_collection
from public.events e
left join lateral (
  select pa.*
  from public.poster_archive pa
  where pa.event_id = e.id
  order by pa.sort_date desc nulls last, pa.updated_at desc
  limit 1
) p on true
where e.published = true;

grant select on public.poster_wall_cards to anon, authenticated;
