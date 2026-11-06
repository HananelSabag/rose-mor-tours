import { ChevronLeft, Inbox, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { AppBar } from '@/components/AppBar'
import { EmptyState, ListSkeleton, Page, Pill } from '@/components/Page'
import { formatDateRange, nightsBetween, pluralNights } from '@/lib/format'
import { REQUEST_STATUS, partySummary } from '@/lib/labels'
import type { RequestStatus } from '@/lib/types'
import { liveOffer, useMyRequests } from './queries'

const STATUS_TONE: Record<RequestStatus, 'lagoon' | 'sun' | 'coral' | 'ocean' | 'muted'> = {
  new: 'lagoon',
  in_progress: 'sun',
  offered: 'coral',
  closed: 'ocean',
  cancelled: 'muted',
}

export function MyOffersPage() {
  const { data: requests, isPending, isError, refetch, sessionReady, signedIn } = useMyRequests()

  return (
    <>
      <AppBar title="ההצעות שלי" />
      <Page>
        {!sessionReady || (signedIn && isPending) ? (
          <ListSkeleton />
        ) : isError ? (
          <p role="alert" className="rounded-field bg-coral-500/10 px-4 py-3 text-[15px] text-coral-700">
            לא הצלחנו לטעון את הבקשות.{' '}
            <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
              לנסות שוב
            </button>
          </p>
        ) : !requests?.length ? (
          <EmptyState icon={Inbox} title="עוד לא שלחתם בקשה" body="ממלאים שאלון של דקה, וההצעה תגיע לכאן ולוואטסאפ." action={{ to: '/search', label: 'לחיפוש מלון' }} />
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => {
              const offer = liveOffer(r)
              return (
                <li key={r.id}>
                  <Link
                    to={offer ? `/o/${offer.public_token}` : `/requests/${r.id}`}
                    className="block rounded-sheet bg-white p-4 shadow-lift transition hover:shadow-glass active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="min-w-0 truncate text-[17px] font-semibold text-ocean-950">{r.destination}</h2>
                      <Pill tone={STATUS_TONE[r.status]}>{REQUEST_STATUS[r.status]}</Pill>
                    </div>
                    <p className="mt-1 text-[15px] text-ink-soft">
                      {formatDateRange(r.check_in, r.check_out)}, {pluralNights(nightsBetween(r.check_in, r.check_out))}
                    </p>
                    <p className="text-[13px] text-ink-faint">{partySummary(r.adults, r.children_ages)}</p>
                    {offer && (
                      <div className="mt-3 flex items-center gap-2.5 rounded-field bg-sun-100 px-3 py-2.5 text-sun-ink">
                        <Sparkles className="size-[18px] shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                          {offer.status === 'accepted' ? 'הוזמן' : 'ההצעה מוכנה'}: {offer.hotel_name}
                        </span>
                        <ChevronLeft className="size-5 shrink-0" />
                      </div>
                    )}
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
