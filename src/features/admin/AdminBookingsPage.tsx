import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Luggage, Ticket } from 'lucide-react'
import { Link, useMatch, useSearchParams } from 'react-router'
import { EmptyState, ListSkeleton } from '@/components/Page'
import { formatDateRange, formatPrice } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/time'
import type { BookingStatus } from '@/lib/types'
import { PickPrompt, SplitView } from './SplitView'

export type AdminBookingRow = {
  id: string
  status: BookingStatus
  amount_ils: number
  created_at: string
  travelers: { passport_path: string | null }[]
  offer: { hotel_name: string; city: string; check_in: string; check_out: string; request: { contact_name: string } | null } | null
}

/** Each tab is what the booking is waiting for, so the label is the next job. */
const TABS: { id: BookingStatus; label: string }[] = [
  { id: 'awaiting_passports', label: 'דרכונים' },
  { id: 'awaiting_payment', label: 'תשלום' },
  { id: 'paid', label: 'וואוצ׳ר' },
  { id: 'voucher_ready', label: 'מוכנות' },
  { id: 'cancelled', label: 'בוטלו' },
]

function BookingList() {
  const [params, setParams] = useSearchParams()
  const openId = useMatch('/admin/bookings/:id')?.params.id
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
      <h1 className="mb-4 hidden text-[1.75rem] font-bold text-ocean-950 lg:block">הזמנות</h1>
      <p className="mb-2 px-1 text-[13px] text-ink-soft">מחכות ל:</p>
      <div className="mb-4 grid grid-cols-5 gap-1 rounded-field bg-white p-1 shadow-lift" role="tablist" aria-label="סינון לפי מה שחסר">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={clsx(
              'flex h-10 items-center justify-center gap-1 rounded-[0.6rem] px-1 text-[13px] font-semibold transition',
              t.id === tab ? 'bg-ocean-800 text-white' : 'text-ink-soft hover:bg-lagoon-50',
            )}
          >
            <span className="truncate">{t.label}</span>
            {counts[t.id] && t.id !== 'cancelled' && t.id !== 'voucher_ready' ? (
              <span className={clsx('tabular grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]', t.id === tab ? 'bg-white/25' : 'bg-lagoon-100 text-ocean-900')}>{counts[t.id]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <p role="alert" className="text-coral-700">
          לא הצלחנו לטעון את ההזמנות.
        </p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Luggage} title="אין הזמנות כאן" body="כשלקוח משריין הצעה, ההזמנה מופיעה מיד." />
      ) : (
        <ul className="divide-y divide-lagoon-100 overflow-hidden rounded-sheet bg-white shadow-lift">
          {rows.map((b) => {
            const uploaded = b.travelers.filter((t) => t.passport_path).length
            const selected = b.id === openId
            return (
              <li key={b.id}>
                <Link
                  to={{ pathname: `/admin/bookings/${b.id}`, search: params.toString() }}
                  aria-current={selected ? 'page' : undefined}
                  className={clsx('block border-s-4 px-4 py-3.5 transition-colors', selected ? 'border-ocean-700 bg-lagoon-50' : 'border-transparent hover:bg-lagoon-50')}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate text-[17px] font-semibold text-ocean-950">{b.offer?.request?.contact_name ?? 'לקוח'}</h2>
                    <span className="tabular shrink-0 text-[15px] font-semibold text-ocean-900">{formatPrice(b.amount_ils)}</span>
                  </div>
                  {b.offer && (
                    <p className="truncate text-[13px] text-ink-soft" dir="auto">
                      {b.offer.hotel_name}, {formatDateRange(b.offer.check_in, b.offer.check_out)}
                    </p>
                  )}
                  <p className="mt-1 text-[13px] text-ink-faint">
                    דרכונים {uploaded}/{b.travelers.length} · {timeAgo(b.created_at)}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function AdminBookingsPage() {
  const open = !!useMatch('/admin/bookings/:id')
  return <SplitView list={<BookingList />} open={open} />
}

export function PickBooking() {
  return <PickPrompt icon={Ticket} text="בחרו הזמנה מהרשימה" />
}
