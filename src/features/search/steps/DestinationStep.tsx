import { Chip } from '@/components/ui/Chip'
import { DESTINATIONS, POPULAR_DESTINATIONS, destinationLabel } from '@/data/destinations'
import { DestinationCombobox } from '../DestinationCombobox'
import { updateDraft } from '../draft'
import type { StepProps } from './types'

export function DestinationStep({ draft, next }: StepProps) {
  return (
    <div className="space-y-6">
      <DestinationCombobox
        value={draft.destination}
        onChange={(destination) => updateDraft({ destination })}
        onPick={next}
        autoFocus={!draft.destination}
      />
      <div>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">יעדים שאנשים בוחרים הרבה</h2>
        <div className="flex flex-wrap gap-2">
          {POPULAR_DESTINATIONS.map((name) => {
            const d = DESTINATIONS.find((x) => x.name === name)
            if (!d) return null
            const label = destinationLabel(d)
            return (
              <Chip
                key={name}
                role="button"
                selected={draft.destination === label}
                onToggle={() => {
                  updateDraft({ destination: label })
                  next()
                }}
              >
                {d.name}
              </Chip>
            )
          })}
        </div>
      </div>
    </div>
  )
}
