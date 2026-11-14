-- Passport scans are deleted automatically (privacy law, Amendment 13):
--   * 30 days after the trip's check-out date
--   * 7 days after a booking was cancelled
-- pg_cron calls the passports-cleanup Edge Function nightly; the function removes the files
-- through the Storage API (deleting storage.objects rows in SQL would orphan the files).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Shared token for the cron -> function hop. Generated inside the database, so its value
-- never appears in code, migrations or logs.
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'passports_cleanup_token',
  'pg_cron -> passports-cleanup Edge Function'
);

-- The function asks the database which scans are due, proving it was called by the cron.
create function public.passports_due_for_deletion(p_token text)
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
      o.check_out < current_date - 30
      or (b.status = 'cancelled' and b.updated_at < now() - interval '7 days')
    );
end;
$$;

revoke execute on function public.passports_due_for_deletion(text) from public, anon, authenticated;
grant execute on function public.passports_due_for_deletion(text) to service_role;

-- Nightly at 02:30 UTC (04:30/05:30 in Israel). Put your project's ref in the URL before applying.
select cron.schedule(
  'passports-cleanup',
  '30 2 * * *',
  $job$
  select net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/passports-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-token', (select decrypted_secret from vault.decrypted_secrets where name = 'passports_cleanup_token')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
