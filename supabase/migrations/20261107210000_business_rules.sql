-- Business rules in the database, not only on screen (logic audit, 7.11).
-- The staff form already blocks these; the database now refuses them too, whoever writes.
-- New CHECKs are NOT VALID: they hold for every new or edited row; old test rows are left alone
-- (validate them after the test data is deleted before launch).

-- 0. Israel's calendar day. The database clock is UTC, where "today" lags until 02:00/03:00.
create function private.today_il() returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Jerusalem')::date $$;

-- 1. Offers: free cancellation is an explicit yes/no, and its deadline is a plain date.
alter table public.offers add column has_free_cancellation boolean;
update public.offers set has_free_cancellation = free_cancellation_until is not null;
alter table public.offers
  alter column has_free_cancellation set not null,
  alter column has_free_cancellation set default false,
  alter column free_cancellation_until type date
    using (free_cancellation_until at time zone 'Asia/Jerusalem')::date;

alter table public.offers
  add constraint offers_free_cancellation check (
    (has_free_cancellation and free_cancellation_until is not null and free_cancellation_until <= check_in)
    or (not has_free_cancellation and free_cancellation_until is null)
  ) not valid,
  add constraint offers_market_above_price check (market_price_ils is null or market_price_ils > price_ils) not valid;

-- One live main offer per request (the alternative hotel hangs off it; it is not a second root).
create unique index offers_one_live_root_per_request on public.offers (request_id)
  where parent_offer_id is null and status = 'sent';

-- 2. What may happen to an offer, and when it expires.
create or replace function private.before_offer_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := private.today_il();
  v_terms_changed boolean := tg_op = 'UPDATE' and
    (new.hotel_name, new.room_type, new.board_basis, new.check_in, new.check_out, new.price_ils,
     new.has_free_cancellation, new.free_cancellation_until, new.cancellation_policy)
    is distinct from
    (old.hotel_name, old.room_type, old.board_basis, old.check_in, old.check_out, old.price_ils,
     old.has_free_cancellation, old.free_cancellation_until, old.cancellation_policy);
begin
  -- A booked or closed offer is what the customer agreed to: change it with a new offer.
  if v_terms_changed and (old.status in ('accepted', 'withdrawn') or exists (
       select 1 from public.bookings b where b.offer_id = old.id and b.status <> 'cancelled')) then
    raise exception 'offer is booked or closed; create a new offer' using errcode = '55000';
  end if;

  -- Changing a live offer restarts it: a fresh 24 hours, "not viewed yet", and staff send it again.
  if v_terms_changed and old.status = 'sent' then
    new.sent_at := null;
    new.first_viewed_at := null;
  end if;

  -- No offers for the past, whenever one is created, changed, sent or renewed.
  if new.status in ('draft', 'sent') and (tg_op = 'INSERT' or v_terms_changed or new.sent_at is null) then
    if new.check_in < v_today then
      raise exception 'check_in is in the past' using errcode = '22023';
    end if;
    if new.free_cancellation_until < v_today then
      raise exception 'free cancellation deadline has passed' using errcode = '22023';
    end if;
  end if;

  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from 'sent' or new.sent_at is null) then
    new.sent_at := now();
    if new.parent_offer_id is not null then
      -- The alternative hotel lives and dies with the main offer.
      select p.expires_at into new.expires_at from public.offers p where p.id = new.parent_offer_id;
    else
      new.expires_at := now() + interval '24 hours';
      -- A new main offer replaces the previous live one, unless that one is already being booked.
      if exists (
        select 1 from public.bookings b join public.offers x on x.id = b.offer_id
        where x.request_id = new.request_id and coalesce(x.parent_offer_id, x.id) <> new.id and b.status <> 'cancelled'
      ) then
        raise exception 'another offer of this request is being booked' using errcode = '55000';
      end if;
      update public.offers set status = 'withdrawn'
      where request_id = new.request_id and parent_offer_id is null and status = 'sent' and id <> new.id;
    end if;
    -- Never bookable after the arrival day ends (Israel time).
    new.expires_at := least(new.expires_at, (new.check_in + 1)::timestamp at time zone 'Asia/Jerusalem');
  end if;
  return new;
end;
$$;

-- 3. A cancelled request leaves nothing bookable behind.
create function private.after_request_cancelled()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bookings b join public.offers o on o.id = b.offer_id
    where o.request_id = new.id and b.status in ('paid', 'voucher_ready')
  ) then
    raise exception 'request has a paid booking; cancel the booking first' using errcode = '55000';
  end if;
  update public.bookings b set status = 'cancelled'
  from public.offers o
  where o.id = b.offer_id and o.request_id = new.id and b.status in ('awaiting_passports', 'awaiting_payment');
  update public.offers set status = 'withdrawn' where request_id = new.id and status in ('draft', 'sent');
  return null;
end;
$$;

create trigger quote_requests_after_cancel
  after update of status on public.quote_requests
  for each row when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function private.after_request_cancelled();

-- Requests whose trip has already started leave the inbox (daily, 00:15 Israel time).
select cron.schedule('stale-requests', '15 22 * * *', $job$
  update public.quote_requests r set status = 'cancelled'
  where r.status in ('new', 'in_progress', 'offered') and r.check_in < private.today_il()
    and not exists (
      select 1 from public.bookings b join public.offers o on o.id = b.offer_id
      where o.request_id = r.id and b.status in ('paid', 'voucher_ready')
    )
$job$);

-- 4. Bookings keep the cancellation terms they were made under, and record cancellations.
alter table public.bookings
  add column free_cancellation_until date,
  add column cancellation_policy text,
  add column cancelled_at timestamptz,
  add column cancel_reason text check (char_length(cancel_reason) <= 300),
  add column refund_ils numeric(10, 2) check (refund_ils >= 0);
alter table public.bookings add constraint bookings_refund_le_amount check (refund_ils is null or refund_ils <= amount_ils);

update public.bookings b
set free_cancellation_until = o.free_cancellation_until, cancellation_policy = o.cancellation_policy
from public.offers o where o.id = b.offer_id;

-- Only real-world status moves (a cancelled booking doesn't come back as paid).
create function private.guard_booking_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and (old.status::text, new.status::text) not in (
    ('awaiting_passports', 'awaiting_payment'), ('awaiting_payment', 'awaiting_passports'),
    ('awaiting_passports', 'paid'), ('awaiting_payment', 'paid'), ('paid', 'voucher_ready'),
    ('awaiting_passports', 'cancelled'), ('awaiting_payment', 'cancelled'),
    ('paid', 'cancelled'), ('voucher_ready', 'cancelled')
  ) then
    raise exception 'booking cannot go from % to %', old.status, new.status using errcode = '55000';
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;

-- Sorts after bookings_before_update, so the voucher -> voucher_ready step is already applied.
create trigger bookings_guard_status
  before update of status on public.bookings
  for each row execute function private.guard_booking_status();

-- 5. Reserving: not for a cancelled request or a past trip; switching hotel keeps the passports.
create or replace function public.start_booking(p_offer_id uuid)
returns uuid
language plpgsql
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

  select * into r from public.quote_requests where id = o.request_id;

  if o.status <> 'sent' or o.expires_at is null or o.expires_at <= now()
     or o.check_in < private.today_il() or r.status in ('cancelled', 'closed') then
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
    if existing.status not in ('awaiting_passports', 'awaiting_payment') then
      raise exception 'offer is already booked' using errcode = 'PT409';
    end if;
    -- Same trip, other hotel: move the booking so the uploaded passports stay.
    update public.bookings
    set offer_id = o.id, amount_ils = o.price_ils,
        free_cancellation_until = o.free_cancellation_until, cancellation_policy = o.cancellation_policy
    where id = existing.id;
    return existing.id;
  end if;

  insert into public.bookings (offer_id, customer_id, amount_ils, contact_phone, free_cancellation_until, cancellation_policy)
  values (o.id, v_uid, o.price_ils, r.contact_phone, o.free_cancellation_until, o.cancellation_policy)
  returning id into v_booking;

  insert into public.travelers (booking_id, is_child)
  select v_booking, false from generate_series(1, r.adults)
  union all
  select v_booking, true from unnest(r.children_ages);

  return v_booking;
end;
$$;

-- 6. Paid: the request's other live offers close.
create or replace function private.after_booking_paid()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.offers set status = 'accepted' where id = new.offer_id and status = 'sent';
  update public.offers x set status = 'withdrawn'
  from public.offers b
  where b.id = new.offer_id and x.request_id = b.request_id and x.status in ('draft', 'sent')
    and coalesce(x.parent_offer_id, x.id) <> coalesce(b.parent_offer_id, b.id);
  update public.quote_requests set status = 'closed'
  where id = (select request_id from public.offers where id = new.offer_id)
    and status <> 'closed';
  return null;
end;
$$;

-- Paid before every passport arrived: the customer can still upload until the voucher is out.
create or replace function private.owns_booking(p_booking_id text, p_editable_only boolean)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.customer_id = (select auth.uid())
      and b.id::text = p_booking_id
      and (not p_editable_only
           or b.status in ('awaiting_passports', 'awaiting_payment')
           or (b.status = 'paid' and b.voucher_path is null))
  )
$$;

-- 7. Travelers: customers upload passport scans; they don't add or remove passengers.
drop policy "add travelers to own unpaid booking or staff" on public.travelers;
drop policy "remove travelers of own unpaid booking or staff" on public.travelers;
create policy "staff add travelers" on public.travelers
  for insert to authenticated with check ((select private.is_staff()));
create policy "staff remove travelers" on public.travelers
  for delete to authenticated using ((select private.is_staff()));

create function private.guard_traveler_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not private.is_staff()
     and (new.booking_id, new.is_child, new.full_name_en) is distinct from (old.booking_id, old.is_child, old.full_name_en) then
    raise exception 'customers can only upload passports' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger travelers_guard_update
  before update on public.travelers
  for each row execute function private.guard_traveler_update();

-- 8. Passport scans of abandoned bookings go too (14 days after the offer ran out),
-- and the cancellation clock is the cancellation itself, not the last edit.
create or replace function public.passports_due_for_deletion(p_token text)
returns table (traveler_id uuid, passport_path text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token is distinct from (
    select decrypted_secret from vault.decrypted_secrets where name = 'passports_cleanup_token'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select t.id, t.passport_path
  from public.travelers t
  join public.bookings b on b.id = t.booking_id
  join public.offers o on o.id = b.offer_id
  where t.passport_path is not null
    and (
      o.check_out < private.today_il() - 30
      or (b.status = 'cancelled' and coalesce(b.cancelled_at, b.updated_at) < now() - interval '7 days')
      or (b.status in ('awaiting_passports', 'awaiting_payment') and o.expires_at < now() - interval '14 days')
    );
end;
$$;
