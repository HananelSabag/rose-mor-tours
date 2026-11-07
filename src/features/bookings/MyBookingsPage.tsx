import { useQuery } from '@tanstack/react-query'
import { BedDouble, Luggage } from 'lucide-react'
import { Link } from 'react-router'
import { AppBar } from '@/components/AppBar'
import { EmptyState, ListSkeleton, Page, Pill } from '@/components/Page'
import { formatDateRange, formatPrice } from '@/lib/format'
import { BOOKING_STATUS } from '@/lib/labels'
import { useSession } from '@/lib/session'
import { hotelImageUrl } from '@/lib/storage'
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
        .select('id, status, amount_ils, offer:offers(hotel_name, city, country, check_in, check_out, images)')
        .eq('customer_id', uid!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  return (
    <>
      <AppBar title="ההזמנות שלי" />
      <Page>
        {!ready || (uid && isPending) ? (
          <ListSkeleton />
        ) : isError ? (
          <p role="alert" className="rounded-field bg-coral-500/10 px-4 py-3 text-[15px] text-coral-700">
            לא הצלחנו לטעון את ההזמנות.{' '}
            <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
              לנסות שוב
            </button>
          </p>
        ) : !bookings?.length ? (
          <EmptyState icon={Luggage} title="עוד אין הזמנות" body="אחרי שתשריינו הצעה, ההזמנה והוואוצ׳ר יחכו לכם כאן." action={{ to: '/offers', label: 'להצעות שלי' }} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bookings.map((b) => {
              const cover = b.offer?.images[0]
              return (
                <li key={b.id}>
                  <Link to={`/bookings/${b.id}`} className="flex gap-3.5 rounded-sheet bg-white p-3 shadow-lift transition hover:shadow-glass active:scale-[0.99]">
                    {cover ? (
                      <img src={hotelImageUrl(cover)} alt="" loading="lazy" className="size-21 shrink-0 rounded-field bg-lagoon-100 object-cover" />
                    ) : (
                      <span className="grid size-21 shrink-0 place-items-center rounded-field bg-lagoon-100 text-ocean-700">
                        <BedDouble className="size-7" strokeWidth={1.7} />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col py-0.5">
                      <h2 className="truncate text-[17px] font-semibold text-ocean-950">{b.offer?.hotel_name ?? 'הזמנה'}</h2>
                      {b.offer && (
                        <p className="truncate text-[13px] text-ink-soft">
                          {b.offer.city}, {b.offer.country}. {formatDateRange(b.offer.check_in, b.offer.check_out)}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <Pill tone={STATUS_TONE[b.status]}>{BOOKING_STATUS[b.status]}</Pill>
                        <span className="tabular text-[15px] font-semibold text-ocean-900">{formatPrice(b.amount_ils)}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Page>
    </>
  )
}
