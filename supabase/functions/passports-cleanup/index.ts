// Deletes passport scans that are past their retention window (see the
// passports_cleanup migration). Invoked nightly by pg_cron with a token only the database knows.
//   POST {}                 -> deletes and returns counts
//   POST {"dry_run": true}  -> returns what would be deleted
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKeys['default'] ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const json = (body: unknown, status = 200) => Response.json(body, { status })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const token = req.headers.get('x-cleanup-token')
  const { dry_run: dryRun = false } = (await req.json().catch(() => ({}))) as { dry_run?: boolean }

  const { data: due, error } = await admin.rpc('passports_due_for_deletion', { p_token: token ?? '' })
  if (error) return json({ error: error.code === '42501' ? 'forbidden' : 'lookup failed' }, error.code === '42501' ? 403 : 500)

  const rows = (due ?? []) as { traveler_id: string; passport_path: string }[]
  if (dryRun || rows.length === 0) return json({ dry_run: dryRun, due: rows.length })

  let deleted = 0
  const failures: string[] = []
  // Storage removes up to 1000 paths per call; stay well under it.
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error: removeError } = await admin.storage.from('passports').remove(batch.map((r) => r.passport_path))
    if (removeError) {
      failures.push(removeError.message)
      continue
    }
    const { error: updateError } = await admin
      .from('travelers')
      .update({ passport_path: null })
      .in('id', batch.map((r) => r.traveler_id))
    if (updateError) failures.push(updateError.message)
    else deleted += batch.length
  }

  console.log(JSON.stringify({ event: 'passports-cleanup', due: rows.length, deleted, failures: failures.length }))
  return json({ due: rows.length, deleted, failures }, failures.length ? 207 : 200)
})
