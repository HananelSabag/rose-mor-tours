import clsx from 'clsx'
import { Check } from 'lucide-react'
import { formatDateRange, nightsBetween, pluralNights } from '@/lib/format'
import { BOARD_BASIS, ROOM_SETUP, VACATION_STYLE, partySummary, starsLabel } from '@/lib/labels'
import { STEPS, isStepValid, type Draft, type StepId } from './draft'

/** One line per step: what the customer answered so far, or nothing yet. */
function answer(id: StepId, d: Draft): string | null {
  switch (id) {
    case 'destination':
      return d.destination.trim() || null
    case 'dates':
      return d.checkIn && d.checkOut && d.checkOut > d.checkIn
        ? `${formatDateRange(d.checkIn, d.checkOut)}, ${pluralNights(nightsBetween(d.checkIn, d.checkOut))}${d.flexibleDays ? `, ±${d.flexibleDays}` : ''}`
        : null
    case 'party': {
      const kids = d.childrenAges.filter((a): a is number => a !== null)
      return `${partySummary(d.adults, kids)}, ${ROOM_SETUP[d.roomSetup].label}`
    }
    case 'style': {
      const parts = [
        d.hotelName.trim(),
        d.minStars ? starsLabel(d.minStars) : '',
        d.boardBasis ? BOARD_BASIS[d.boardBasis].label : '',
        d.vacationStyles.map((s) => VACATION_STYLE[s]).join(', '),
      ].filter(Boolean)
      return parts.length ? parts.join(', ') : 'בלי העדפות מיוחדות'
    }
    case 'contact':
      return d.contactName.trim() ? `${d.contactName.trim()}${d.contactPhone ? `, ${d.contactPhone}` : ''}` : null
  }
}

/**
 * Desktop side panel: the request as it builds up, each line a way back to its step.
 * Only steps already reached can be opened, so the flow's order still holds.
 */
export function DraftSummary({ draft, current, onOpen }: { draft: Draft; current: number; onOpen: (index: number) => void }) {
  return (
    <aside className="sticky top-24 rounded-sheet bg-white p-5 shadow-lift" aria-label="הבקשה שלכם">
      <h2 className="mb-3 text-[17px] font-semibold text-ocean-950">הבקשה שלכם</h2>
      <ol className="space-y-1">
        {STEPS.map((s, i) => {
          const reached = i <= current
          const done = i < current && isStepValid(s.id, draft)
          const text = reached ? answer(s.id, draft) : null
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={!reached || i === current}
                onClick={() => onOpen(i)}
                className={clsx(
                  'flex w-full items-start gap-3 rounded-field px-2 py-2 text-start transition',
                  i === current ? 'bg-lagoon-50' : reached && 'hover:bg-lagoon-50',
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-semibold',
                    done ? 'bg-turquoise-500 text-white' : i === current ? 'bg-ocean-800 text-white' : 'bg-lagoon-100 text-ink-faint',
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx('block text-[13px]', reached ? 'text-ink-soft' : 'text-ink-faint')}>{s.title}</span>
                  {text && (
                    <span className="block text-[15px] font-medium text-ink" dir="auto">
                      {text}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
