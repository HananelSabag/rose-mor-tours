import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { queryClient } from './queryClient'
import { supabase } from './supabase'

type SessionSnapshot = { session: Session | null; ready: boolean }

let snapshot: SessionSnapshot = { session: null, ready: false }
const listeners = new Set<() => void>()

// A guest who signs in gets a new user id. Before leaving for Google the guest takes a
// one-time token; the signed-in account redeems it and the guest's requests move over.
const CLAIM_KEY = 'rm.guest-claim'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Call right before signing in. Does nothing for someone who isn't a guest. */
export async function beginGuestClaim(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user.is_anonymous) return
  const { data: token } = await supabase.rpc('start_guest_claim')
  if (token) storage()?.setItem(CLAIM_KEY, token)
}

async function finishGuestClaim(token: string) {
  const { data: moved, error } = await supabase.rpc('finish_guest_claim', { p_token: token })
  if (!error && moved) void queryClient.invalidateQueries()
}

// INITIAL_SESSION fires right after subscribing, so `ready` flips once storage is read.
supabase.auth.onAuthStateChange((event, session) => {
  // Never show one person's cached requests to the next person on a shared device.
  if (event === 'SIGNED_OUT') queryClient.clear()
  snapshot = { session, ready: true }
  for (const notify of listeners) notify()

  if (session && !session.user.is_anonymous) {
    const token = storage()?.getItem(CLAIM_KEY)
    if (token) {
      storage()?.removeItem(CLAIM_KEY)
      // Supabase calls inside this callback can deadlock the auth lock; run after it returns.
      setTimeout(() => void finishGuestClaim(token), 0)
    }
  }
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
