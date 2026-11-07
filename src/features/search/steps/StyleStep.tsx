import { Star } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { BOARD_BASIS, VACATION_STYLE } from '@/lib/labels'
import type { BoardBasis, VacationStyle } from '@/lib/types'
import { updateDraft } from '../draft'
import type { StepProps } from './types'

const STAR_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'לא משנה' },
  { value: 3, label: '3 ומעלה' },
  { value: 4, label: '4 ומעלה' },
  { value: 5, label: '5' },
]

export function StyleStep({ draft }: StepProps) {
  const toggleStyle = (style: VacationStyle) =>
    updateDraft((d) => ({
      vacationStyles: d.vacationStyles.includes(style)
        ? d.vacationStyles.filter((s) => s !== style)
        : [...d.vacationStyles, style],
    }))

  return (
    <div className="space-y-8">
      <section>
        <label htmlFor="hotel-name" className="mb-1 block text-[17px] font-semibold">
          יש מלון מסוים?
        </label>
        <p className="mb-3 text-[13px] text-ink-soft">לא חובה. נבדוק אותו אצל הספקים שלנו.</p>
        <input
          id="hotel-name"
          // An English hotel name reads left to right, but the Hebrew placeholder stays on the right.
          dir={draft.hotelName ? 'auto' : 'rtl'}
          enterKeyHint="next"
          value={draft.hotelName}
          onChange={(e) => updateDraft({ hotelName: e.target.value })}
          placeholder="למשל Lindos Blu"
          className="h-13 w-full rounded-field bg-white px-4 text-[17px] ring-1 ring-lagoon-200 outline-none placeholder:text-start placeholder:text-ink-faint focus:ring-2 focus:ring-ocean-700"
        />
      </section>

      <section>
        <h2 className="mb-3 text-[17px] font-semibold">כמה כוכבים?</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="דירוג כוכבים">
          {STAR_OPTIONS.map((o) => (
            <Chip key={o.label} role="radio" selected={draft.minStars === o.value} onToggle={() => updateDraft({ minStars: o.value })}>
              {o.value && <Star className="size-4 fill-sun-400 text-sun-400" />}
              {o.label}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[17px] font-semibold">ארוחות</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="בסיס אירוח">
          <Chip role="radio" selected={draft.boardBasis === null} onToggle={() => updateDraft({ boardBasis: null })}>
            לא משנה
          </Chip>
          {(Object.keys(BOARD_BASIS) as BoardBasis[]).map((key) => (
            <Chip key={key} role="radio" selected={draft.boardBasis === key} onToggle={() => updateDraft({ boardBasis: key })}>
              {BOARD_BASIS[key].label}
            </Chip>
          ))}
        </div>
        {draft.boardBasis && <p className="mt-2 text-[13px] text-ink-soft">{BOARD_BASIS[draft.boardBasis].hint}</p>}
      </section>

      <section>
        <h2 className="mb-1 text-[17px] font-semibold">איזו חופשה?</h2>
        <p className="mb-3 text-[13px] text-ink-soft">אפשר לבחור יותר מאחד</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VACATION_STYLE) as VacationStyle[]).map((key) => (
            <Chip key={key} selected={draft.vacationStyles.includes(key)} onToggle={() => toggleStyle(key)}>
              {VACATION_STYLE[key]}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <label htmlFor="notes" className="mb-1 block text-[17px] font-semibold">
          משהו נוסף שחשוב לכם?
        </label>
        <p className="mb-3 text-[13px] text-ink-soft">לא חובה</p>
        <textarea
          id="notes"
          rows={3}
          maxLength={1000}
          value={draft.notes}
          onChange={(e) => updateDraft({ notes: e.target.value })}
          placeholder="קרוב לחוף, בריכה מחוממת, מתאים לעגלה..."
          className="w-full resize-none rounded-field bg-white p-4 text-base ring-1 ring-lagoon-200 outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ocean-700"
        />
      </section>
    </div>
  )
}
