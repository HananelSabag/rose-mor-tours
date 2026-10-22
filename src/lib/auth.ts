import type { Session } from '@supabase/supabase-js'
import { useSession } from './session'

type Claims = { user_role?: 'customer' | 'admin' | 'owner'; is_anonymous?: boolean; email?: string }

/** The access token is the source of truth for the role (set by the custom access token hook). */
export function claimsOf(session: Session | null): Claims | null {
  const part = session?.access_token.split('.')[1]
  if (!part) return null
  try {
    const binary = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as Claims
  } catch {
    return null
  }
}

export function useStaff() {
  const { session, ready } = useSession()
  const claims = claimsOf(session)
  const role = claims?.user_role ?? 'customer'
  return { session, ready, role, isStaff: role === 'admin' || role === 'owner', email: claims?.email || null }
}
