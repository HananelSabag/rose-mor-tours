import { DayPicker, type DateRange } from 'react-day-picker'
import { he } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import '../daypicker.css'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { formatDateRange, nightsBetween, parseISODate, pluralNights, toISODate } from '@/lib/format'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { updateDraft, type Draft } from '../draft'
import type { StepProps } from './types'

const FLEX_OPTIONS: { value: Draft['flexibleDays']; label: string }[] = [
  { value: 0, label: 'בדיוק בתאריכים' },
  { value: 1, label: 'יום לפני או אחרי' },
  { value: 2, label: 'עד יומיים' },
]

export function DatesStep({ draft }: StepProps) {
  const wide = useMediaQuery('(min-width: 768px)')
  // Fixed for the lifetime of the step; recomputing per render would only churn the picker.
  const [{ today, lastMonth }] = useState(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return { today: start, lastMonth: new Date(start.getFullYear(), start.getMonth() + 18, 1) }
  })

  const selected: DateRange | undefined = draft.checkIn
    ? { from: parseISODate(draft.checkIn), to: draft.checkOut ? parseISODate(draft.checkOut) : undefined }
    : undefined

  const range = draft.checkIn && draft.checkOut && draft.checkOut > draft.checkIn ? { from: draft.checkIn, to: draft.checkOut } : null

  return (
    <div className="space-y-6">
      <div className="rounded-sheet bg-white p-3 ring-1 ring-lagoon-200 sm:p-5">
        <DayPicker
          mode="range"
          dir="rtl"
          locale={he}
          numberOfMonths={wide ? 2 : 1}
          defaultMonth={selected?.from ?? today}
          startMonth={today}
          endMonth={lastMonth}
          disabled={{ before: today }}
          excludeDisabled
          min={1}
          selected={selected}
          onSelect={(r) =>
            updateDraft({
              checkIn: r?.from ? toISODate(r.from) : null,
              checkOut: r?.to && r.from && r.to > r.from ? toISODate(r.to) : null,
            })
          }
        />
      </div>

      <p className="flex min-h-7 items-center gap-2 text-lg" aria-live="polite">
        <CalendarDays className="size-5 shrink-0 text-turquoise-500" />
        {range ? (
          <span>
            <span className="font-semibold">{formatDateRange(range.from, range.to)}</span>
            <span className="text-ink-soft">, {pluralNights(nightsBetween(range.from, range.to))}</span>
          </span>
        ) : (
          <span className="text-ink-soft">{draft.checkIn ? 'עכשיו בחרו את יום החזרה' : 'בחרו את יום ההגעה למלון'}</span>
        )}
      </p>

      <div>
        <h2 className="mb-3 font-medium">התאריכים גמישים?</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="גמישות בתאריכים">
          {FLEX_OPTIONS.map((o) => (
            <Chip key={o.value} role="radio" selected={draft.flexibleDays === o.value} onToggle={() => updateDraft({ flexibleDays: o.value })}>
              {o.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}
