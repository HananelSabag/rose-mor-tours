-- Rose&Mor tours: initial schema.
-- Access model:
--   * Every customer is a Supabase user (anonymous at first, linked to Google/email at payment).
--   * Staff role (admin/owner) lives in profiles.role and reaches the JWT as the `user_role`
--     claim via the custom access token hook, so RLS never queries profiles per row.
--   * Nothing is exposed to anon/authenticated by default; every grant below is explicit.

-- ---------------------------------------------------------------------------
-- Secure defaults: future objects are not exposed to the Data API unless granted.
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin', 'owner');
create type public.request_status as enum ('new', 'in_progress', 'offered', 'closed', 'cancelled');
create type public.offer_status as enum ('draft', 'sent', 'accepted', 'withdrawn');
create type public.booking_status as enum ('awaiting_passports', 'awaiting_payment', 'paid', 'voucher_ready', 'cancelled');
create type public.board_basis as enum ('RO', 'BB', 'HB', 'FB', 'AI');
create type public.room_setup as enum ('one_room', 'connecting', 'suite');
create type public.vacation_style as enum ('resort', 'city', 'adults_only', 'family');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function private.is_staff()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'user_role', '') in ('admin', 'owner')
$$;

create function private.is_owner()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'user_role', '') = 'owner'
$$;

-- 22-char URL-safe token (122 random bits) for the public offer link.
create function private.random_token()
returns text
language sql volatile
set search_path = ''
as $$
  select rtrim(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), '=')
$$;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

grant execute on function private.is_staff(), private.is_owner(), private.random_token()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (char_length(email) <= 254),
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth user (anonymous included). role feeds the user_role JWT claim.';

create index profiles_staff_idx on public.profiles (role) where role <> 'customer';

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Only the owner may change roles through the API.
create function private.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user = 'authenticated'
     and not private.is_owner() then
    raise exception 'only the owner can change roles' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update of role on public.profiles
  for each row execute function private.guard_profile_role();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, nullif(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Anonymous users get an email when they link Google / email OTP at checkout.
create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = nullif(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Custom access token hook: adds `user_role` to every JWT.
-- ---------------------------------------------------------------------------
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := event -> 'claims';
  v_role public.user_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(v_role, 'customer'::public.user_role)));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- quote_requests: the questionnaire
-- ---------------------------------------------------------------------------
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status public.request_status not null default 'new',
  destination text not null check (char_length(destination) between 2 and 120),
  hotel_name text check (char_length(hotel_name) <= 160), -- null = "choose for me"
  check_in date not null,
  check_out date not null,
  flexible_days smallint not null default 0 check (flexible_days between 0 and 2),
  adults smallint not null check (adults between 1 and 12),
  children_ages smallint[] not null default '{}'
    check (cardinality(children_ages) <= 8 and 0 <= all (children_ages) and 17 >= all (children_ages)),
  room_setup public.room_setup not null default 'one_room',
  min_stars smallint check (min_stars between 2 and 5),
  board_basis public.board_basis, -- null = no preference
  vacation_styles public.vacation_style[] not null default '{}',
  notes text check (char_length(notes) <= 1000),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  contact_phone text not null check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_requests_dates check (check_out > check_in)
);

create index quote_requests_customer_created_idx on public.quote_requests (customer_id, created_at desc);
create index quote_requests_status_created_idx on public.quote_requests (status, created_at desc);

create trigger quote_requests_touch_updated_at
  before update on public.quote_requests
  for each row execute function private.touch_updated_at();

-- Customers cannot pick their own status/timestamps, book the past, or flood the inbox.
create function private.before_quote_request_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not private.is_staff() then
    new.status := 'new';
    new.created_at := now();
    new.updated_at := now();

    if new.check_in < current_date then
      raise exception 'check_in is in the past' using errcode = '22023';
    end if;

    if (select count(*) from public.quote_requests q
        where q.customer_id = new.customer_id
          and q.created_at > now() - interval '1 day') >= 5 then
      raise exception 'too many requests' using errcode = 'PT429';
    end if;
  end if;
  return new;
end;
$$;

create trigger quote_requests_before_insert
  before insert on public.quote_requests
  for each row execute function private.before_quote_request_insert();

-- ---------------------------------------------------------------------------
-- offers: built by staff, opened by the customer through /o/<public_token>
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests (id) on delete cascade,
  parent_offer_id uuid references public.offers (id) on delete cascade, -- set = alternative hotel
  public_token text not null unique default private.random_token(),
  status public.offer_status not null default 'draft',
  hotel_name text not null check (char_length(hotel_name) between 2 and 160),
  city text not null check (char_length(city) between 2 and 80),
  country text not null check (char_length(country) between 2 and 80),
  stars smallint check (stars between 1 and 5),
  room_type text not null check (char_length(room_type) between 2 and 120),
  board_basis public.board_basis not null,
  check_in date not null,
  check_out date not null,
  price_ils numeric(10, 2) not null check (price_ils > 0),
  -- Consumer-protection law: a "market price" must be real, so its source is mandatory.
  market_price_ils numeric(10, 2) check (market_price_ils > 0),
  market_price_source text check (char_length(market_price_source) <= 300),
  cancellation_policy text check (char_length(cancellation_policy) <= 2000),
  free_cancellation_until timestamptz,
  images text[] not null default '{}' check (cardinality(images) <= 12), -- hotel-images paths
  highlights text[] not null default '{}' check (cardinality(highlights) <= 8),
  sent_at timestamptz,
  expires_at timestamptz, -- server-set: sent_at + 24h
  first_viewed_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_dates check (check_out > check_in),
  constraint offers_market_price_sourced check (market_price_ils is null or market_price_source is not null),
  constraint offers_not_own_parent check (parent_offer_id <> id)
);

create index offers_request_id_idx on public.offers (request_id);
create index offers_parent_offer_id_idx on public.offers (parent_offer_id) where parent_offer_id is not null;
create index offers_created_by_idx on public.offers (created_by);

create trigger offers_touch_updated_at
  before update on public.offers
  for each row execute function private.touch_updated_at();

-- The 24h timer always starts on the server, at the moment the offer is sent.
create function private.before_offer_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from 'sent') then
    new.sent_at := now();
    new.expires_at := now() + interval '24 hours';
  end if;
  return new;
end;
$$;

create trigger offers_before_write
  before insert or update of status on public.offers
  for each row execute function private.before_offer_write();

-- Sending/withdrawing a primary offer carries its alternatives along and moves the request.
create function private.after_offer_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_offer_id is not null
     or (tg_op = 'UPDATE' and old.status = new.status) then
    return null;
  end if;

  if new.status = 'sent' then
    update public.offers set status = 'sent'
    where parent_offer_id = new.id and status = 'draft';

    update public.quote_requests set status = 'offered'
    where id = new.request_id and status in ('new', 'in_progress');
  elsif new.status = 'withdrawn' then
    update public.offers set status = 'withdrawn'
    where parent_offer_id = new.id and status in ('draft', 'sent');
  end if;
  return null;
end;
$$;

create trigger offers_after_status_change
  after insert or update of status on public.offers
  for each row execute function private.after_offer_status_change();

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete restrict,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  status public.booking_status not null default 'awaiting_passports',
  amount_ils numeric(10, 2) not null check (amount_ils > 0),
  installments smallint not null default 1 check (installments between 1 and 12),
  contact_email text check (char_length(contact_email) <= 254),
  contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  grow_process_id text unique,
  grow_transaction_id text unique,
  receipt_url text,
  paid_at timestamptz,
  voucher_path text,
  voucher_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index bookings_one_active_per_offer on public.bookings (offer_id) where status <> 'cancelled';
create index bookings_customer_created_idx on public.bookings (customer_id, created_at desc);
create index bookings_status_created_idx on public.bookings (status, created_at desc);

create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function private.touch_updated_at();

-- Customers may only edit their contact details and installments; money and status are server-side.
create function private.guard_booking_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not private.is_staff()
     and (new.offer_id, new.customer_id, new.status, new.amount_ils, new.grow_process_id,
          new.grow_transaction_id, new.receipt_url, new.paid_at, new.voucher_path,
          new.voucher_ready_at, new.created_at)
         is distinct from
         (old.offer_id, old.customer_id, old.status, old.amount_ils, old.grow_process_id,
          old.grow_transaction_id, old.receipt_url, old.paid_at, old.voucher_path,
          old.voucher_ready_at, old.created_at) then
    raise exception 'customers can only edit contact details' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger bookings_guard_update
  before update on public.bookings
  for each row execute function private.guard_booking_update();

-- True when the caller owns the booking (optionally: and it is still before payment).
-- Takes text so storage policies can pass a folder name without a failing uuid cast.
create function private.owns_booking(p_booking_id text, p_editable_only boolean)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.customer_id = (select auth.uid())
      and b.id::text = p_booking_id
      and (not p_editable_only or b.status in ('awaiting_passports', 'awaiting_payment'))
  )
$$;

grant execute on function private.owns_booking(text, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- travelers: one row per passenger, passport scan in the private bucket
-- ---------------------------------------------------------------------------
create table public.travelers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  full_name_en text check (full_name_en ~ '^[A-Za-z][A-Za-z '' -]{1,79}$'),
  is_child boolean not null default false,
  passport_path text,
  passport_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travelers_passport_in_booking_folder
    check (passport_path is null or passport_path like booking_id::text || '/%')
);

create index travelers_booking_id_idx on public.travelers (booking_id);

create trigger travelers_touch_updated_at
  before update on public.travelers
  for each row execute function private.touch_updated_at();

create function private.stamp_passport_upload()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.passport_path is distinct from old.passport_path then
    new.passport_uploaded_at := case when new.passport_path is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger travelers_stamp_passport_upload
  before insert or update of passport_path on public.travelers
  for each row execute function private.stamp_passport_upload();

-- ---------------------------------------------------------------------------
-- push_subscriptions (Web Push from the PWA)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- payment_events: raw grow webhooks, processed exactly once (event_key is unique)
-- ---------------------------------------------------------------------------
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null default 'grow',
  event_key text not null unique,
  booking_id uuid references public.bookings (id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index payment_events_booking_id_idx on public.payment_events (booking_id);

-- ---------------------------------------------------------------------------
-- Grants (explicit; RLS below decides which rows)
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.quote_requests, public.offers, public.bookings,
  public.travelers, public.push_subscriptions, public.payment_events from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.quote_requests to authenticated;
grant select, insert, update, delete on public.offers to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert, update, delete on public.travelers to authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant select on public.payment_events to authenticated;

grant all on public.profiles, public.quote_requests, public.offers, public.bookings,
  public.travelers, public.push_subscriptions, public.payment_events to service_role;

grant select on public.profiles to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.quote_requests enable row level security;
alter table public.offers enable row level security;
alter table public.bookings enable row level security;
alter table public.travelers enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.payment_events enable row level security;

-- profiles
create policy "auth admin reads roles" on public.profiles
  for select to supabase_auth_admin using (true);
create policy "read own profile or staff" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));
create policy "update own profile or staff" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()))
  with check (id = (select auth.uid()) or (select private.is_staff()));

-- quote_requests
create policy "create own request" on public.quote_requests
  for insert to authenticated
  with check (customer_id = (select auth.uid()));
create policy "read own requests or staff" on public.quote_requests
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_staff()));
create policy "staff update requests" on public.quote_requests
  for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff delete requests" on public.quote_requests
  for delete to authenticated
  using ((select private.is_staff()));

-- offers
create policy "read sent offers of own requests or staff" on public.offers
  for select to authenticated
  using (
    (select private.is_staff())
    or (status <> 'draft' and exists (
      select 1 from public.quote_requests r
      where r.id = offers.request_id and r.customer_id = (select auth.uid())
    ))
  );
create policy "staff insert offers" on public.offers
  for insert to authenticated with check ((select private.is_staff()));
create policy "staff update offers" on public.offers
  for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff delete offers" on public.offers
  for delete to authenticated using ((select private.is_staff()));

-- bookings (customers create them through an RPC, not directly)
create policy "read own bookings or staff" on public.bookings
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_staff()));
create policy "staff insert bookings" on public.bookings
  for insert to authenticated with check ((select private.is_staff()));
create policy "edit own unpaid booking or staff" on public.bookings
  for update to authenticated
  using (
    (select private.is_staff())
    or (customer_id = (select auth.uid()) and status in ('awaiting_passports', 'awaiting_payment'))
  )
  with check ((select private.is_staff()) or customer_id = (select auth.uid()));

-- travelers
create policy "read travelers of own booking or staff" on public.travelers
  for select to authenticated
  using ((select private.is_staff()) or private.owns_booking(booking_id::text, false));
create policy "add travelers to own unpaid booking or staff" on public.travelers
  for insert to authenticated
  with check ((select private.is_staff()) or private.owns_booking(booking_id::text, true));
create policy "edit travelers of own unpaid booking or staff" on public.travelers
  for update to authenticated
  using ((select private.is_staff()) or private.owns_booking(booking_id::text, true))
  with check ((select private.is_staff()) or private.owns_booking(booking_id::text, true));
create policy "remove travelers of own unpaid booking or staff" on public.travelers
  for delete to authenticated
  using ((select private.is_staff()) or private.owns_booking(booking_id::text, true));

-- push_subscriptions
create policy "read own push subscriptions" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "add own push subscription" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "remove own push subscription" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- payment_events (written only by the service role in the webhook)
create policy "staff read payment events" on public.payment_events
  for select to authenticated using ((select private.is_staff()));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('hotel-images', 'hotel-images', true, 5242880,
    array['image/webp', 'image/jpeg', 'image/png', 'image/avif']),
  ('passports', 'passports', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']),
  ('vouchers', 'vouchers', false, 20971520,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

-- hotel-images: public read through the CDN URL; staff write.
create policy "staff read hotel images" on storage.objects
  for select to authenticated
  using (bucket_id = 'hotel-images' and (select private.is_staff()));
create policy "staff upload hotel images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'hotel-images' and (select private.is_staff()));
create policy "staff update hotel images" on storage.objects
  for update to authenticated
  using (bucket_id = 'hotel-images' and (select private.is_staff()))
  with check (bucket_id = 'hotel-images' and (select private.is_staff()));
create policy "staff delete hotel images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'hotel-images' and (select private.is_staff()));

-- passports/{booking_id}/{traveler_id}.{ext}: the customer writes only into their own
-- unpaid booking's folder (select+update are needed for re-uploads); staff read via signed URLs.
create policy "read passports of own unpaid booking or staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'passports' and (
    (select private.is_staff()) or private.owns_booking((storage.foldername(name))[1], true)));
create policy "upload passports to own unpaid booking" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'passports' and (
    (select private.is_staff()) or private.owns_booking((storage.foldername(name))[1], true)));
create policy "replace passports in own unpaid booking" on storage.objects
  for update to authenticated
  using (bucket_id = 'passports' and (
    (select private.is_staff()) or private.owns_booking((storage.foldername(name))[1], true)))
  with check (bucket_id = 'passports' and (
    (select private.is_staff()) or private.owns_booking((storage.foldername(name))[1], true)));
create policy "remove passports from own unpaid booking or staff" on storage.objects
  for delete to authenticated
  using (bucket_id = 'passports' and (
    (select private.is_staff()) or private.owns_booking((storage.foldername(name))[1], true)));

-- vouchers/{booking_id}/{file}: staff write, the booking's customer reads.
create policy "read vouchers of own booking or staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'vouchers' and (
    (select private.is_staff()) or private.owns_booking((storage.foldername(name))[1], false)));
create policy "staff upload vouchers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vouchers' and (select private.is_staff()));
create policy "staff update vouchers" on storage.objects
  for update to authenticated
  using (bucket_id = 'vouchers' and (select private.is_staff()))
  with check (bucket_id = 'vouchers' and (select private.is_staff()));
create policy "staff delete vouchers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vouchers' and (select private.is_staff()));
