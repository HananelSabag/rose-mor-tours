import clsx from 'clsx'
import { Check } from 'lucide-react'
import type { RequestStatus } from '@/lib/types'

const STAGES = [
  { title: 'הבקשה התקבלה', hint: 'הפרטים אצלנו' },
  { title: 'מחפשים לכם מלון', hint: 'הצוות בודק מחירים אצל הספקים' },
  { title: 'ההצעה נשלחה', hint: 'בוואטסאפ ובאפליקציה, בתוקף ל־24 שעות' },
]

// Once a request exists it has been received, so "searching" is the live stage right away.
function stageOf(status: RequestStatus): number {
  return status === 'new' || status === 'in_progress' ? 1 : 2
}

export function StatusTrack({ status }: { status: RequestStatus }) {
  if (status === 'cancelled') {
    return <p className="rounded-field bg-lagoon-100 px-4 py-3 text-ocean-900">הבקשה בוטלה. אפשר לשלוח בקשה חדשה בכל רגע.</p>
  }
  const current = stageOf(status)
  return (
    <ol className="relative space-y-6">
      {STAGES.map((stage, i) => {
        const done = i < current || (i === current && i === STAGES.length - 1)
        const active = i === current && !done
        return (
          <li key={stage.title} className="relative flex gap-4">
            {i < STAGES.length - 1 && (
              <span
                aria-hidden="true"
                className={clsx('absolute start-[0.9rem] top-8 -bottom-6 w-0.5', i < current ? 'bg-turquoise-500' : 'bg-lagoon-200')}
              />
            )}
            <span
              className={clsx(
                'relative grid size-7.5 shrink-0 place-items-center rounded-full',
                done && 'bg-turquoise-500 text-white',
                active && 'bg-sun-300 ring-4 ring-sun-300/40',
                !done && !active && 'bg-white ring-2 ring-lagoon-200',
              )}
            >
              {done && <Check className="size-4" strokeWidth={3} />}
              {active && <span className="size-2.5 animate-pulse rounded-full bg-coral-500" />}
            </span>
            <span className={clsx(!done && !active && 'text-ink-faint')}>
              <span className="block font-semibold">{stage.title}</span>
              <span className="block text-sm text-ink-soft">{stage.hint}</span>
            </span>
            <span className="sr-only">{done ? 'הושלם' : active ? 'בטיפול עכשיו' : 'עוד לא'}</span>
          </li>
        )
      })}
    </ol>
  )
}
