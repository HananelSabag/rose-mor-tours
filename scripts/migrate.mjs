// Applies supabase/migrations/*.sql to an environment, skipping names it already has.
//   node scripts/migrate.mjs dev|prod [--dry-run]
// Needs SUPABASE_AGENCY_TOKEN (Windows user env var, never stored in the repo).
import { readdir, readFile } from 'node:fs/promises'

const PROJECTS = { dev: 'your-project-ref', prod: 'your-project-ref' }
const env = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
const ref = PROJECTS[env]
const token = process.env.SUPABASE_AGENCY_TOKEN

if (!ref) {
  console.error('Usage: node scripts/migrate.mjs dev|prod [--dry-run]')
  process.exit(1)
}
if (!token) {
  console.error('SUPABASE_AGENCY_TOKEN is not set')
  process.exit(1)
}

const api = (path, init = {}) =>
  fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  })

const res = await api('/database/migrations')
if (!res.ok) {
  console.error(`Could not list migrations: ${res.status} ${await res.text()}`)
  process.exit(1)
}
const applied = new Set((await res.json()).map((m) => m.name))

const dir = new URL('../supabase/migrations/', import.meta.url)
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

for (const file of files) {
  // 20261022120751_initial_schema.sql -> initial_schema
  const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '')
  if (applied.has(name)) {
    console.log(`= ${name} (already applied)`)
    continue
  }
  if (dryRun) {
    console.log(`+ ${name} (would apply)`)
    continue
  }
  const query = await readFile(new URL(file, dir), 'utf8')
  const r = await api('/database/migrations', {
    method: 'POST',
    headers: { 'Idempotency-Key': `${env}-${name}` },
    body: JSON.stringify({ name, query }),
  })
  if (!r.ok) {
    console.error(`✗ ${name}: ${r.status} ${await r.text()}`)
    process.exit(1)
  }
  console.log(`+ ${name} applied to ${env}`)
}
