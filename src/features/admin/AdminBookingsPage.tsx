import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronLeft, Luggage } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState, Loading, Pill } from '@/components/Page'
import { formatDateRange, formatPrice } from '@/lib/format'
import { BOOKING_STATUS } from '@/lib/labels'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/time'
import type { BookingStatus } from '@/lib/types'
import { BOOKING_TONE } from './tones'

export type AdminBookingRow = {
  id: string
  status: BookingStatus
  amount_ils: number
  created_at: string
  travelers: { passport_path: string | null }[]
  offer: { hotel_name: string; city: string; check_in: string; check_out: string; request: { contact_name: string } | null } | null
}

const TABS: { id: BookingStatus; label: string }[] = [
  { id: 'awaiting_passports', label: 'מחכות לדרכונים' },
  { id: 'awaiting_payment', label: 'מחכות לתשלום' },
  { id: 'paid', label: 'שולמו, בלי וואוצ׳ר' },
  { id: 'voucher_ready', label: 'מוכנות' },
  { id: 'cancelled', label: 'בוטלו' },
]

export function AdminBookingsPage() {
  const [params, setParams] = useSearchParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, status, amount_ils, created_at, travelers(passport_path), offer:offers(hotel_name, city, check_in, check_out, request:quote_requests(contact_name))')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as unknown as AdminBookingRow[]
    },
  })

  const counts: Partial<Record<BookingStatus, number>> = {}
  for (const b of data ?? []) counts[b.status] = (counts[b.status] ?? 0) + 1
  // Open on whatever needs action first.
  const fallback = (['awaiting_payment', 'paid', 'awaiting_passports', 'voucher_ready'] as const).find((s) => counts[s]) ?? 'awaiting_payment'
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? fallback) as BookingStatus
  const rows = (data ?? []).filter((b) => b.status === tab)

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold text-ocean-950">הזמנות</h1>
      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              onClick={() => setParams({ tab: t.id }, { replace: true })}
              className={clsx('inline-flex h-11 items-center gap-2 rounded-full px-4 font-medium transition', t.id === tab ? 'bg-ocean-800 text-white' : 'bg-white ring-1 ring-lagoon-200 hover:ring-turquoise-400')}
            >
              {t.label}
              {counts[t.id] && t.id !== 'cancelled' ? (
                <span className={clsx('tabular grid min-w-6 place-items-center rounded-full px-1.5 text-sm', t.id === tab ? 'bg-white/20' : 'bg-lagoon-100')}>{counts[t.id]}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <Loading />
      ) : isError ? (
        <p role="alert" className="text-coral-600">לא הצלחנו לטעון את ההזמנות.</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Luggage} title="אין הזמנות בסטטוס הזה" body="כשלקוח לוחץ על ״שריין ושלם עכשיו״, ההזמנה מופיעה כאן מיד." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((b) => {
            const uploaded = b.travelers.filter((t) => t.passport_path).length
            return (
              <li key={b.id}>
                <Link to={`/admin/bookings/${b.id}`} className="flex items-center gap-3 rounded-sheet bg-white p-5 shadow-lift ring-1 ring-lagoon-200/70 transition hover:ring-turquoise-400">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="truncate text-lg font-bold">{b.offer?.request?.contact_name ?? 'לקוח'}</h2>
                      <span className="tabular shrink-0 font-semibold text-ocean-900">{formatPrice(b.amount_ils)}</span>
                    </div>
                    {b.offer && (
                      <p className="text-ink-soft">
                        {b.offer.hotel_name}, {b.offer.city}. {formatDateRange(b.offer.check_in, b.offer.check_out)}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <Pill tone={BOOKING_TONE[b.status]}>{BOOKING_STATUS[b.status]}</Pill>
                      <span className="text-ink-soft">
                        דרכונים {uploaded}/{b.travelers.length}
                      </span>
                      <span className="text-ink-faint">{timeAgo(b.created_at)}</span>
                    </div>
                  </div>
                  <ChevronLeft className="size-5 shrink-0 text-ink-faint" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
