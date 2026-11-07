-- One sign-in for everyone. A customer who already sent requests as a guest (anonymous
-- user) and then signs in with Google gets a new user id; this hands the guest's data over.
-- The guest asks for a one-time token before leaving for Google, and the signed-in account
-- redeems it on return. Holding the token is the proof that the guest session was theirs.

create table private.guest_claims (
  token uuid primary key default gen_random_uuid(),
  guest_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.start_guest_claim()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid;
begin
  -- Only a guest has anything to hand over.
  if auth.uid() is null or not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return null;
  end if;
  delete from private.guest_claims
  where guest_id = auth.uid() or created_at < now() - interval '1 day';
  insert into private.guest_claims (guest_id) values (auth.uid()) returning token into v_token;
  return v_token;
end;
$$;

create function public.finish_guest_claim(p_token uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_guest uuid;
  v_moved integer := 0;
  v_rows integer;
begin
  if v_me is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in first' using errcode = '42501';
  end if;

  delete from private.guest_claims
  where token = p_token and created_at > now() - interval '1 hour'
  returning guest_id into v_guest;
  if v_guest is null or v_guest = v_me then
    return 0;
  end if;

  update public.quote_requests set customer_id = v_me where customer_id = v_guest;
  get diagnostics v_rows = row_count;
  v_moved := v_moved + v_rows;

  update public.bookings set customer_id = v_me where customer_id = v_guest;
  get diagnostics v_rows = row_count;
  v_moved := v_moved + v_rows;

  update public.push_subscriptions set user_id = v_me where user_id = v_guest;

  -- Keep the name and phone typed in the questionnaire when the account has none yet.
  update public.profiles p
  set full_name = coalesce(p.full_name, g.full_name),
      phone = coalesce(p.phone, g.phone)
  from public.profiles g
  where p.id = v_me and g.id = v_guest;

  return v_moved;
end;
$$;

revoke all on function public.start_guest_claim() from public, anon;
revoke all on function public.finish_guest_claim(uuid) from public, anon;
grant execute on function public.start_guest_claim() to authenticated;
grant execute on function public.finish_guest_claim(uuid) to authenticated;
