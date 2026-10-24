import { ChevronLeft, Inbox } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState, ListSkeleton, Page, PageTitle, Pill } from '@/components/Page'
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
    <Page>
      <PageTitle title="ההצעות שלי" subtitle="הבקשות ששלחתם וההצעות שהצוות הכין לכם." />

      {!sessionReady || (signedIn && isPending) ? (
        <ListSkeleton />
      ) : isError ? (
        <p role="alert" className="rounded-field bg-coral-500/10 px-4 py-3 text-coral-700">
          לא הצלחנו לטעון את הבקשות.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            לנסות שוב
          </button>
        </p>
      ) : !requests?.length ? (
        <EmptyState
          icon={Inbox}
          title="עוד לא שלחתם בקשה"
          body="ממלאים שאלון של דקה, וההצעה תגיע לכאן ולוואטסאפ."
          action={{ to: '/search', label: 'לחיפוש מלון' }}
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                to={liveOffer(r) ? `/o/${liveOffer(r)!.public_token}` : `/requests/${r.id}`}
                className="flex items-center gap-4 rounded-sheet bg-white p-5 shadow-lift transition hover:-translate-y-px hover:shadow-glass active:translate-y-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2">
                    <Pill tone={STATUS_TONE[r.status]}>{REQUEST_STATUS[r.status]}</Pill>
                  </div>
                  <h2 className="truncate text-xl font-bold text-ocean-950">{r.destination}</h2>
                  <p className="mt-1 text-ink-soft">
                    {formatDateRange(r.check_in, r.check_out)}, {pluralNights(nightsBetween(r.check_in, r.check_out))}
                  </p>
                  <p className="text-sm text-ink-faint">{partySummary(r.adults, r.children_ages)}</p>
                  {liveOffer(r) && (
                    <p className="mt-2 font-semibold text-coral-700">לצפייה בהצעה: {liveOffer(r)!.hotel_name}</p>
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
