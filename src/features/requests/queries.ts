import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

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
        .select('*')
        .eq('customer_id', uid!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
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
      const { data, error } = await supabase.from('quote_requests').select('*').eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
  return { ...query, sessionReady: ready, signedIn: !!session }
}
