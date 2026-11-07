import clsx from 'clsx'
import { Eye, Inbox } from 'lucide-react'
import { Link, useMatch, useSearchParams } from 'react-router'
import { EmptyState, ListSkeleton, Pill } from '@/components/Page'
import { formatDateRange, nightsBetween, pluralNights } from '@/lib/format'
import { partySummary } from '@/lib/labels'
import { timeAgo, useNow } from '@/lib/time'
import type { RequestStatus } from '@/lib/types'
import { offerState, useActiveRequests, useArchivedRequests, type InboxRequest } from './queries'
import { PickPrompt, SplitView } from './SplitView'

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
  return <span className="shrink-0 text-[13px] text-ink-faint">{timeAgo(iso, now)}</span>
}

function OfferLine({ request }: { request: InboxRequest }) {
  const now = useNow()
  const root = request.offers.find((o) => !o.parent_offer_id && o.status !== 'withdrawn')
  if (!root) return null
  const state = offerState(root, now)
  return (
    <div className="mt-2 flex items-center gap-2 text-[13px]">
      <Pill tone={state.tone}>{state.label}</Pill>
      {root.status === 'sent' && root.first_viewed_at && (
        <span className="inline-flex items-center gap-1 text-ocean-700">
          <Eye className="size-3.5" /> נצפתה
        </span>
      )}
    </div>
  )
}

/** The requests list; on desktop it stays beside the open request. */
function RequestList() {
  const [params, setParams] = useSearchParams()
  const openId = useMatch('/admin/requests/:id')?.params.id
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
      <h1 className="mb-4 hidden text-[1.75rem] font-bold text-ocean-950 lg:block">בקשות</h1>

      {/* Status tabs: a segmented control that fits a phone width */}
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-field bg-white p-1 shadow-lift" role="tablist" aria-label="סינון לפי סטטוס">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={clsx(
              'relative flex h-10 items-center justify-center gap-1 rounded-[0.6rem] px-1 text-[13px] font-semibold transition',
              t.id === tab ? 'bg-ocean-800 text-white' : 'text-ink-soft hover:bg-lagoon-50',
            )}
          >
            <span className="truncate">{t.label}</span>
            {t.id !== 'archive' && counts[t.id] ? (
              <span className={clsx('tabular grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]', t.id === 'new' ? 'bg-coral-600 text-white' : t.id === tab ? 'bg-white/25' : 'bg-lagoon-100 text-ocean-900')}>
                {counts[t.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {source.isPending ? (
        <ListSkeleton />
      ) : source.isError ? (
        <p role="alert" className="rounded-field bg-coral-500/10 px-4 py-3 text-coral-700">
          לא הצלחנו לטעון את הבקשות.
        </p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title="אין כאן בקשות" body={tab === 'new' ? 'בקשה חדשה תופיע כאן מיד כשתישלח, בלי לרענן.' : 'כשיהיו בקשות בסטטוס הזה, הן יופיעו כאן.'} />
      ) : (
        <ul className="divide-y divide-lagoon-100 overflow-hidden rounded-sheet bg-white shadow-lift">
          {rows.map((r) => {
            const selected = r.id === openId
            return (
              <li key={r.id}>
                <Link
                  to={{ pathname: `/admin/requests/${r.id}`, search: params.toString() }}
                  aria-current={selected ? 'page' : undefined}
                  className={clsx('block border-s-4 px-4 py-3.5 transition-colors', selected ? 'border-ocean-700 bg-lagoon-50' : 'border-transparent hover:bg-lagoon-50')}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate text-[17px] font-semibold text-ocean-950">{r.contact_name}</h2>
                    <Ago iso={r.created_at} />
                  </div>
                  <p className="truncate text-[15px] font-medium text-ocean-800">{r.destination}</p>
                  <p className="truncate text-[13px] text-ink-soft">
                    {formatDateRange(r.check_in, r.check_out)}, {pluralNights(nightsBetween(r.check_in, r.check_out))}
                    {r.flexible_days ? ` ±${r.flexible_days}` : ''} · {partySummary(r.adults, r.children_ages)}
                  </p>
                  <OfferLine request={r} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function InboxPage() {
  const open = !!useMatch('/admin/requests/:id')
  return <SplitView list={<RequestList />} open={open} />
}

export function PickRequest() {
  return <PickPrompt icon={Inbox} text="בחרו בקשה מהרשימה" />
}
