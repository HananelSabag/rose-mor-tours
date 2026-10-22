import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import type { Offer, QuoteRequest } from '@/lib/types'

// Customers only ever receive sent/accepted offers (RLS hides drafts).
export type CustomerOffer = Pick<Offer, 'id' | 'public_token' | 'status' | 'parent_offer_id' | 'hotel_name' | 'price_ils' | 'expires_at'>
export type CustomerRequest = QuoteRequest & { offers: CustomerOffer[] }
const SELECT = '*, offers(id, public_token, status, parent_offer_id, hotel_name, price_ils, expires_at)'

/** The offer the customer should open: the newest live primary offer. */
export function liveOffer(r: CustomerRequest): CustomerOffer | undefined {
  return r.offers.filter((o) => !o.parent_offer_id && (o.status === 'sent' || o.status === 'accepted')).at(-1)
}

/** The signed-in customer's own requests (staff accounts would otherwise see everyone's). */
export function useMyRequests() {
  const { session, ready } = useSession()
  const uid = session?.user.id
  const query = useQuery({
    queryKey: ['requests', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(SELECT)
        .eq('customer_id', uid!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as CustomerRequest[]
    },
  })
  return { ...query, sessionReady: ready, signedIn: !!uid }
}

export function useRequest(id: string | undefined) {
  const { session, ready } = useSession()
  const query = useQuery({
    queryKey: ['request', id],
    enabled: !!id && !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('quote_requests').select(SELECT).eq('id', id!).maybeSingle()
      if (error) throw error
      return data as unknown as CustomerRequest | null
    },
  })
  return { ...query, sessionReady: ready, signedIn: !!session }
}
