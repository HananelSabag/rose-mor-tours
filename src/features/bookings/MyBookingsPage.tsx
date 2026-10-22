import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Luggage } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState, Loading, Page, PageTitle, Pill } from '@/components/Page'
import { formatDateRange, formatPrice } from '@/lib/format'
import { BOOKING_STATUS } from '@/lib/labels'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import type { BookingStatus } from '@/lib/types'

const STATUS_TONE: Record<BookingStatus, 'lagoon' | 'sun' | 'coral' | 'ocean' | 'muted'> = {
  awaiting_passports: 'coral',
  awaiting_payment: 'coral',
  paid: 'sun',
  voucher_ready: 'ocean',
  cancelled: 'muted',
}

export function MyBookingsPage() {
  const { session, ready } = useSession()
  const uid = session?.user.id

  const { data: bookings, isPending, isError, refetch } = useQuery({
    queryKey: ['bookings', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, status, amount_ils, offer:offers(hotel_name, city, country, check_in, check_out)')
        .eq('customer_id', uid!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  return (
    <Page>
      <PageTitle title="ההזמנות שלי" subtitle="ההזמנות שלכם, מהדרכונים ועד הוואוצ׳ר." />

      {!ready || (uid && isPending) ? (
        <Loading />
      ) : isError ? (
        <p role="alert" className="rounded-field bg-coral-500/10 px-4 py-3 text-coral-600">
          לא הצלחנו לטעון את ההזמנות.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            לנסות שוב
          </button>
        </p>
      ) : !bookings?.length ? (
        <EmptyState
          icon={Luggage}
          title="עוד אין הזמנות"
          body="אחרי שתשריינו הצעה, ההזמנה והוואוצ׳ר יחכו לכם כאן."
          action={{ to: '/offers', label: 'להצעות שלי' }}
        />
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link
                to={`/bookings/${b.id}`}
                className="flex items-center gap-3 rounded-sheet bg-white p-5 shadow-lift ring-1 ring-lagoon-200/70 transition hover:ring-turquoise-400"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Pill tone={STATUS_TONE[b.status]}>
                      {BOOKING_STATUS[b.status]}
                      {b.status === 'voucher_ready' && ' 🎉'}
                    </Pill>
                    <span className="tabular font-semibold text-ocean-900">{formatPrice(b.amount_ils)}</span>
                  </div>
                  {b.offer && (
                    <>
                      <h2 className="text-xl font-bold text-ocean-950">{b.offer.hotel_name}</h2>
                      <p className="mt-1 text-ink-soft">
                        {b.offer.city}, {b.offer.country}. {formatDateRange(b.offer.check_in, b.offer.check_out)}
                      </p>
                    </>
                  )}
                </div>
                <ChevronLeft className="size-6 shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
