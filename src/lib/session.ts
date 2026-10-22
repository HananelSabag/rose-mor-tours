import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { queryClient } from './queryClient'
import { supabase } from './supabase'

type SessionSnapshot = { session: Session | null; ready: boolean }

let snapshot: SessionSnapshot = { session: null, ready: false }
const listeners = new Set<() => void>()

// INITIAL_SESSION fires right after subscribing, so `ready` flips once storage is read.
supabase.auth.onAuthStateChange((event, session) => {
  // Never show one person's cached requests to the next person on a shared device.
  if (event === 'SIGNED_OUT') queryClient.clear()
  snapshot = { session, ready: true }
  for (const notify of listeners) notify()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSession(): SessionSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot)
}

/**
 * Customers never register to send a request: the first submit creates an anonymous
 * Supabase user, which they can later upgrade (Google / email) at checkout.
 */
export async function ensureSession(): Promise<Session> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  const { data: created, error } = await supabase.auth.signInAnonymously()
  if (error || !created.session) throw error ?? new Error('Anonymous sign-in failed')
  return created.session
}
