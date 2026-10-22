// Regenerates src/lib/database.types.ts from the live Supabase schema.
// Needs SUPABASE_AGENCY_TOKEN (Windows user env var, never stored in the repo).
import { writeFile } from 'node:fs/promises'

const PROJECT_REF = 'your-project-ref'
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
