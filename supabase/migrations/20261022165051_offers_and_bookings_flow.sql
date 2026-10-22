-- Offers & bookings flow: public offer RPC, server-side booking, status automation, realtime.

-- ---------------------------------------------------------------------------
-- Offer timer: also restarts when staff clear sent_at ("renew 24h").
-- ---------------------------------------------------------------------------
create or replace function private.before_offer_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'sent'
     and (tg_op = 'INSERT' or old.status is distinct from 'sent' or new.sent_at is null) then
    new.sent_at := now();
    new.expires_at := now() + interval '24 hours';
  end if;
  return new;
end;
$$;

create or replace trigger offers_before_write
  before insert or update of status, sent_at on public.offers
  for each row execute function private.before_offer_write();

-- A first draft moves the request to in_progress; sending/renewing/withdrawing a primary
-- offer carries its alternatives along.
create or replace function private.after_offer_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.quote_requests set status = 'in_progress'
    where id = new.request_id and status = 'new';
  end if;

  if new.parent_offer_id is not null then
    return null;
  end if;

  if new.status = 'sent'
     and (tg_op = 'INSERT' or old.status is distinct from 'sent' or old.sent_at is distinct from new.sent_at) then
    -- sent_at = null makes each alternative restart its own 24h timer in the before trigger
    update public.offers set status = 'sent', sent_at = null
    where parent_offer_id = new.id and status in ('draft', 'sent');

    update public.quote_requests set status = 'offered'
    where id = new.request_id and status in ('new', 'in_progress');
  elsif new.status = 'withdrawn' and tg_op = 'UPDATE' and old.status <> 'withdrawn' then
    update public.offers set status = 'withdrawn'
    where parent_offer_id = new.id and status in ('draft', 'sent');
  end if;
  return null;
end;
$$;

create or replace trigger offers_after_status_change
  after insert or update of status, sent_at on public.offers
  for each row execute function private.after_offer_status_change();

-- ---------------------------------------------------------------------------
-- get_offer(token): the public offer page. The token is the authorization.
-- ---------------------------------------------------------------------------
create function private.offer_public_json(o public.offers)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'hotel_name', o.hotel_name,
    'city', o.city,
    'country', o.country,
    'stars', o.stars,
    'room_type', o.room_type,
    'board_basis', o.board_basis,
    'check_in', o.check_in,
    'check_out', o.check_out,
    'price_ils', o.price_ils,
    'market_price_ils', o.market_price_ils,
    'market_price_source', o.market_price_source,
    'cancellation_policy', o.cancellation_policy,
    'free_cancellation_until', o.free_cancellation_until,
    'images', o.images,
    'highlights', o.highlights,
    'expires_at', o.expires_at
  )
$$;

create function public.get_offer(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o public.offers;
  r public.quote_requests;
  v_uid uuid := auth.uid();
  v_mine uuid;
  v_taken boolean;
begin
  select * into o from public.offers
  where public_token = p_token and parent_offer_id is null and status in ('sent', 'accepted');
  if not found then
    return null;
  end if;

  select * into r from public.quote_requests where id = o.request_id;

  if o.first_viewed_at is null and not private.is_staff() then
    update public.offers set first_viewed_at = now() where id = o.id;
  end if;

  select b.id into v_mine
  from public.bookings b join public.offers x on x.id = b.offer_id
  where coalesce(x.parent_offer_id, x.id) = o.id and b.status <> 'cancelled' and b.customer_id = v_uid
  limit 1;

  select exists (
    select 1 from public.bookings b join public.offers x on x.id = b.offer_id
    where coalesce(x.parent_offer_id, x.id) = o.id and b.status <> 'cancelled'
      and b.customer_id is distinct from v_uid
  ) into v_taken;

  return jsonb_build_object(
    'offer', private.offer_public_json(o),
    'alternatives', coalesce((
      select jsonb_agg(private.offer_public_json(a) order by a.created_at)
      from public.offers a
      where a.parent_offer_id = o.id and a.status in ('sent', 'accepted')
    ), '[]'::jsonb),
    'request', jsonb_build_object(
      'destination', r.destination,
      'adults', r.adults,
      'children_ages', r.children_ages,
      'room_setup', r.room_setup,
      'first_name', split_part(r.contact_name, ' ', 1)
    ),
    'my_booking_id', v_mine,
    'taken', v_taken
  );
end;
$$;

revoke execute on function public.get_offer(text) from public;
grant execute on function public.get_offer(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- start_booking(offer): "reserve & pay". Locks the offer group so two people
-- cannot book the same offer; creates one traveler row per passenger.
-- ---------------------------------------------------------------------------
create function public.start_booking(p_offer_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  o public.offers;
  v_root uuid;
  r public.quote_requests;
  existing record;
  v_booking uuid;
begin
  if v_uid is null then
    raise exception 'sign-in required' using errcode = '42501';
  end if;

  select * into o from public.offers where id = p_offer_id;
  if not found then
    raise exception 'offer not found' using errcode = 'PT404';
  end if;
  v_root := coalesce(o.parent_offer_id, o.id);
  perform 1 from public.offers where id = v_root for update;

  if o.status <> 'sent' or o.expires_at is null or o.expires_at <= now() then
    raise exception 'offer is no longer available' using errcode = 'PT410';
  end if;

  select b.id, b.customer_id, b.offer_id, b.status into existing
  from public.bookings b join public.offers x on x.id = b.offer_id
  where coalesce(x.parent_offer_id, x.id) = v_root and b.status <> 'cancelled'
  limit 1;

  if found then
    if existing.customer_id <> v_uid then
      raise exception 'offer is already being booked' using errcode = 'PT409';
    end if;
    if existing.offer_id = p_offer_id then
      return existing.id;
    end if;
    -- Same customer switched between the primary hotel and the alternative.
    if existing.status not in ('awaiting_passports', 'awaiting_payment') then
      raise exception 'offer is already booked' using errcode = 'PT409';
    end if;
    update public.bookings set status = 'cancelled' where id = existing.id;
  end if;

  select * into r from public.quote_requests where id = o.request_id;

  insert into public.bookings (offer_id, customer_id, amount_ils, contact_phone)
  values (o.id, v_uid, o.price_ils, r.contact_phone)
  returning id into v_booking;

  insert into public.travelers (booking_id, is_child)
  select v_booking, false from generate_series(1, r.adults)
  union all
  select v_booking, true from unnest(r.children_ages);

  return v_booking;
end;
$$;

revoke execute on function public.start_booking(uuid) from public;
grant execute on function public.start_booking(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_booking_details(booking): passports + contact are in, hand over to payment.
-- ---------------------------------------------------------------------------
create function public.submit_booking_details(p_booking_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings
  where id = p_booking_id and customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'booking not found' using errcode = 'PT404';
  end if;
  if b.status <> 'awaiting_passports' then
    return; -- already submitted
  end if;
  if exists (select 1 from public.travelers t where t.booking_id = b.id and t.passport_path is null) then
    raise exception 'missing passports' using errcode = 'PT422';
  end if;
  if b.contact_email is null or b.contact_phone is null then
    raise exception 'missing contact details' using errcode = 'PT422';
  end if;
  update public.bookings set status = 'awaiting_payment' where id = b.id;
end;
$$;

revoke execute on function public.submit_booking_details(uuid) from public;
grant execute on function public.submit_booking_details(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Booking status automation (runs as the staff member or the service role).
-- ---------------------------------------------------------------------------
create function private.before_booking_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  -- Uploading the voucher is what makes it "ready".
  if new.voucher_path is not null and old.voucher_path is null and new.status = 'paid' then
    new.status := 'voucher_ready';
  end if;
  if new.status = 'voucher_ready' and old.status is distinct from 'voucher_ready' then
    new.voucher_ready_at := now();
  end if;
  return new;
end;
$$;

create trigger bookings_before_update
  before update on public.bookings
  for each row execute function private.before_booking_update();

create function private.after_booking_paid()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.offers set status = 'accepted' where id = new.offer_id and status = 'sent';
  update public.quote_requests set status = 'closed'
  where id = (select request_id from public.offers where id = new.offer_id)
    and status <> 'closed';
  return null;
end;
$$;

create trigger bookings_after_paid
  after update of status on public.bookings
  for each row
  when (new.status = 'paid' and old.status is distinct from 'paid')
  execute function private.after_booking_paid();

-- ---------------------------------------------------------------------------
-- Realtime: the staff inbox and booking board update live (RLS still applies).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.quote_requests, public.bookings, public.travelers;
