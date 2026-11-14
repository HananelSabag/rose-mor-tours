// Regenerates src/lib/database.types.ts from the live Supabase schema.
// Needs SUPABASE_AGENCY_TOKEN (a Supabase access token in an env var, never stored in the repo);
// the project is the one VITE_SUPABASE_URL in .env points at.
import { readFile, writeFile } from 'node:fs/promises'

const env = await readFile(new URL('../.env', import.meta.url), 'utf8').catch(() => '')
const PROJECT_REF = /^VITE_SUPABASE_URL=https:\/\/([a-z0-9]+)\.supabase\.co/m.exec(env)?.[1]
if (!PROJECT_REF) {
  console.error('VITE_SUPABASE_URL is not set in .env')
  process.exit(1)
}
const token = process.env.SUPABASE_AGENCY_TOKEN
if (!token) {
  console.error('SUPABASE_AGENCY_TOKEN is not set')
  process.exit(1)
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/types/typescript?included_schemas=public`,
  { headers: { Authorization: `Bearer ${token}` } },
)
if (!res.ok) {
  console.error(`Failed: ${res.status} ${await res.text()}`)
  process.exit(1)
}
const { types } = await res.json()
await writeFile(new URL('../src/lib/database.types.ts', import.meta.url), types)
console.log('src/lib/database.types.ts updated')
