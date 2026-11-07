import { OptionCard } from '@/components/ui/OptionCard'
import { Stepper } from '@/components/ui/Stepper'
import { ROOM_SETUP, childAgeLabel } from '@/lib/labels'
import type { RoomSetup } from '@/lib/types'
import { updateDraft } from '../draft'
import type { StepProps } from './types'

const AGES = Array.from({ length: 18 }, (_, age) => age)

export function PartyStep({ draft }: StepProps) {
  const setChildren = (count: number) =>
    updateDraft((d) => ({
      childrenAges: count > d.childrenAges.length
        ? [...d.childrenAges, ...Array<null>(count - d.childrenAges.length).fill(null)]
        : d.childrenAges.slice(0, count),
    }))

  return (
    <div className="space-y-8">
      <div className="divide-y divide-lagoon-200 rounded-sheet bg-white px-5 py-2 ring-1 ring-lagoon-200">
        <Stepper label="מבוגרים" hint="מגיל 18" value={draft.adults} min={1} max={12} onChange={(adults) => updateDraft({ adults })} />
        <Stepper label="ילדים" hint="עד גיל 17" value={draft.childrenAges.length} min={0} max={8} onChange={setChildren} />

        {draft.childrenAges.length > 0 && (
          <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
            {draft.childrenAges.map((age, index) => (
              <label key={index} className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">גיל ילד {index + 1}</span>
                <select
                  value={age ?? ''}
                  onChange={(e) =>
                    updateDraft((d) => ({
                      childrenAges: d.childrenAges.map((a, i) => (i === index ? Number(e.target.value) : a)),
                    }))
                  }
                  className={`h-12 w-full rounded-field bg-lagoon-50 px-3 text-base ring-1 outline-none focus:ring-2 focus:ring-ocean-700 ${
                    age === null ? 'ring-sun-400' : 'ring-lagoon-200'
                  }`}
                >
                  <option value="" disabled>
                    בחרו גיל
                  </option>
                  {AGES.map((a) => (
                    <option key={a} value={a}>
                      {childAgeLabel(a)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="col-span-full text-sm text-ink-soft">הגיל בזמן החופשה. המחיר במלון תלוי בו.</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-[17px] font-semibold">איך לחלק אתכם לחדרים?</h2>
        <div className="space-y-3" role="radiogroup" aria-label="הרכב חדרים">
          {(Object.keys(ROOM_SETUP) as RoomSetup[]).map((key) => {
            return (
              <OptionCard
                key={key}
                selected={draft.roomSetup === key}
                onSelect={() => updateDraft({ roomSetup: key })}
                title={ROOM_SETUP[key].label}
                hint={ROOM_SETUP[key].hint}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
