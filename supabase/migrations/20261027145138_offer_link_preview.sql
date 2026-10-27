-- Link previews for /o/<token> (WhatsApp, Facebook). Called by the Cloudflare Worker for
-- crawlers, so unlike get_offer it never marks the offer as viewed and returns only what a
-- preview card shows.
create function public.get_offer_preview(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'hotel_name', o.hotel_name,
    'city', o.city,
    'country', o.country,
    'stars', o.stars,
    'check_in', o.check_in,
    'check_out', o.check_out,
    'price_ils', o.price_ils,
    'image', o.images[1]
  )
  from public.offers o
  where o.public_token = p_token
    and o.parent_offer_id is null
    and o.status in ('sent', 'accepted')
$$;

revoke execute on function public.get_offer_preview(text) from public;
grant execute on function public.get_offer_preview(text) to anon, authenticated;
