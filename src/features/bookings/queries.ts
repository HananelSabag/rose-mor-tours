import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export const BOOKING_SELECT =
  'id, status, amount_ils, installments, contact_email, contact_phone, receipt_url, paid_at, voucher_path, voucher_ready_at, created_at, free_cancellation_until, cancellation_policy, ' +
  'offer:offers(id, hotel_name, city, country, stars, room_type, board_basis, check_in, check_out, images, public_token), ' +
  'travelers(id, is_child, full_name_en, passport_path, created_at)'

export function useBooking(id: string | undefined) {
  const { session, ready } = useSession()
  const query = useQuery({
    queryKey: ['booking', id],
    enabled: !!id && !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT)
        .eq('id', id!)
        .order('created_at', { referencedTable: 'travelers', ascending: true })
        .maybeSingle()
      if (error) throw error
      return data as unknown as BookingDetails | null
    },
  })
  return { ...query, sessionReady: ready, signedIn: !!session }
}

export type BookingDetails = {
  id: string
  status: 'awaiting_passports' | 'awaiting_payment' | 'paid' | 'voucher_ready' | 'cancelled'
  amount_ils: number
  installments: number
  contact_email: string | null
  contact_phone: string | null
  receipt_url: string | null
  paid_at: string | null
  voucher_path: string | null
  voucher_ready_at: string | null
  created_at: string
  /** The cancellation terms at the moment of booking (null: no free cancellation). */
  free_cancellation_until: string | null
  cancellation_policy: string | null
  offer: {
    id: string
    hotel_name: string
    city: string
    country: string
    stars: number | null
    room_type: string
    board_basis: 'RO' | 'BB' | 'HB' | 'FB' | 'AI'
    check_in: string
    check_out: string
    images: string[]
    public_token: string
  } | null
  travelers: { id: string; is_child: boolean; full_name_en: string | null; passport_path: string | null; created_at: string }[]
}

/** "נוסע 1", "נוסע 2", "ילד 1"... in the order they were created. */
export function travelerLabels(travelers: BookingDetails['travelers']): string[] {
  let adults = 0
  let kids = 0
  return travelers.map((t) => (t.is_child ? `ילד ${++kids}` : `מבוגר ${++adults}`))
}

export async function openSignedFile(bucket: 'passports' | 'vouchers', path: string, download?: string) {
  // Open the tab synchronously (inside the click) so popup blockers allow it, then point it at the file.
  const tab = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120, download ? { download } : undefined)
  if (error || !data) {
    tab?.close()
    throw error ?? new Error('signing failed')
  }
  if (tab) tab.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}
