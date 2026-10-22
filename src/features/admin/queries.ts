import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Offer, QuoteRequest } from '@/lib/types'

export type InboxOffer = Pick<Offer, 'id' | 'status' | 'parent_offer_id' | 'first_viewed_at' | 'expires_at' | 'price_ils' | 'hotel_name'>
export type InboxRequest = QuoteRequest & { offers: InboxOffer[] }

const INBOX_SELECT = '*, offers(id, status, parent_offer_id, first_viewed_at, expires_at, price_ils, hotel_name)'

/** Everything still in play. Small by nature (it empties as requests close), so one query. */
export function useActiveRequests() {
  return useQuery({
    queryKey: ['admin', 'requests', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(INBOX_SELECT)
        .in('status', ['new', 'in_progress', 'offered'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as InboxRequest[]
    },
  })
}

export function useArchivedRequests(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'requests', 'archive'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(INBOX_SELECT)
        .in('status', ['closed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as unknown as InboxRequest[]
    },
  })
}

export type AdminRequest = QuoteRequest & {
  offers: (Offer & { bookings: { id: string; status: string }[] })[]
}

export function useAdminRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'request', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('*, offers(*, bookings(id, status))')
        .eq('id', id!)
        .order('created_at', { referencedTable: 'offers', ascending: true })
        .maybeSingle()
      if (error) throw error
      return data as unknown as AdminRequest | null
    },
  })
}

/** Display state of an offer, including "expired" which is derived, not stored. */
export function offerState(o: Pick<Offer, 'status' | 'expires_at'>, now: number): { label: string; tone: 'muted' | 'lagoon' | 'sun' | 'coral' | 'ocean' } {
  if (o.status === 'draft') return { label: 'טיוטה', tone: 'muted' }
  if (o.status === 'withdrawn') return { label: 'בוטלה', tone: 'muted' }
  if (o.status === 'accepted') return { label: 'הוזמנה', tone: 'ocean' }
  if (!o.expires_at || new Date(o.expires_at).getTime() <= now) return { label: 'פגה', tone: 'coral' }
  return { label: 'נשלחה', tone: 'lagoon' }
}
