import clsx from 'clsx'
import { ChevronLeft, Eye, EyeOff, Inbox } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState, Loading, Pill } from '@/components/Page'
import { formatDateRange, nightsBetween, pluralNights } from '@/lib/format'
import { partySummary } from '@/lib/labels'
import { remaining, timeAgo, useNow } from '@/lib/time'
import type { RequestStatus } from '@/lib/types'
import { offerState, useActiveRequests, useArchivedRequests, type InboxRequest } from './queries'

const TABS = [
  { id: 'new', label: 'חדשות', statuses: ['new'] },
  { id: 'in_progress', label: 'בטיפול', statuses: ['in_progress'] },
  { id: 'offered', label: 'נשלחה הצעה', statuses: ['offered'] },
  { id: 'archive', label: 'ארכיון', statuses: ['closed', 'cancelled'] },
] as const satisfies readonly { id: string; label: string; statuses: readonly RequestStatus[] }[]

type TabId = (typeof TABS)[number]['id']

// Only these small leaves subscribe to the 1s clock, not the whole list.
function Ago({ iso }: { iso: string }) {
  const now = useNow()
  return <span className="shrink-0 text-sm text-ink-faint">{timeAgo(iso, now)}</span>
}

function OfferLine({ request }: { request: InboxRequest }) {
  const now = useNow()
  const root = request.offers.find((o) => !o.parent_offer_id && o.status !== 'withdrawn')
  if (!root) return null
  const state = offerState(root, now)
  const left = root.status === 'sent' ? remaining(root.expires_at, now) : null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <Pill tone={state.tone}>{state.label}</Pill>
      {root.status === 'sent' &&
        (root.first_viewed_at ? (
          <span className="inline-flex items-center gap-1 text-ocean-700">
            <Eye className="size-4" /> נצפתה {timeAgo(root.first_viewed_at, now)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-ink-faint">
            <EyeOff className="size-4" /> עוד לא נצפתה
          </span>
        ))}
      {left && <span className="tabular text-ink-soft" dir="ltr">{left}</span>}
    </div>
  )
}

export function InboxPage() {
  const [params, setParams] = useSearchParams()
  const active = useActiveRequests()

  const counts = { new: 0, in_progress: 0, offered: 0 } as Record<string, number>
  for (const r of active.data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1

  const fallback: TabId = counts.new ? 'new' : counts.in_progress ? 'in_progress' : 'offered'
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? fallback) as TabId
  const archive = useArchivedRequests(tab === 'archive')
  const statuses: readonly string[] = TABS.find((t) => t.id === tab)!.statuses
  const source = tab === 'archive' ? archive : active
  const rows = (source.data ?? []).filter((r) => statuses.includes(r.status))

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold text-ocean-950">בקשות</h1>

      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2" role="tablist" aria-label="סינון לפי סטטוס">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              onClick={() => setParams({ tab: t.id }, { replace: true })}
              className={clsx(
                'inline-flex h-11 items-center gap-2 rounded-full px-4 font-medium transition',
                t.id === tab ? 'bg-ocean-800 text-white' : 'bg-white text-ink ring-1 ring-lagoon-200 hover:ring-turquoise-400',
              )}
            >
              {t.label}
              {t.id !== 'archive' && counts[t.id] ? (
                <span className={clsx('tabular grid min-w-6 place-items-center rounded-full px-1.5 text-sm', t.id === 'new' ? 'bg-coral-500 text-white' : t.id === tab ? 'bg-white/20' : 'bg-lagoon-100')}>
                  {counts[t.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {source.isPending ? (
        <Loading />
      ) : source.isError ? (
        <p role="alert" className="rounded-field bg-coral-500/10 px-4 py-3 text-coral-600">לא הצלחנו לטעון את הבקשות.</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title="אין כאן בקשות" body={tab === 'new' ? 'בקשה חדשה תופיע כאן מיד כשתישלח, בלי לרענן.' : 'כשיהיו בקשות בסטטוס הזה, הן יופיעו כאן.'} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link to={`/admin/requests/${r.id}`} className="flex items-center gap-3 rounded-sheet bg-white p-5 shadow-lift ring-1 ring-lagoon-200/70 transition hover:ring-turquoise-400">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate text-lg font-bold">{r.contact_name}</h2>
                    <Ago iso={r.created_at} />
                  </div>
                  <p className="mt-1 font-semibold text-ocean-800">{r.destination}</p>
                  <p className="text-ink-soft">
                    {formatDateRange(r.check_in, r.check_out)}, {pluralNights(nightsBetween(r.check_in, r.check_out))}
                    {r.flexible_days ? ` (±${r.flexible_days})` : ''}
                  </p>
                  <p className="text-sm text-ink-faint">
                    {partySummary(r.adults, r.children_ages)}
                    {r.hotel_name ? `. מלון: ${r.hotel_name}` : ''}
                  </p>
                  <OfferLine request={r} />
                </div>
                <ChevronLeft className="size-5 shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
