import { Hotel, Sparkles } from 'lucide-react'
import { OptionCard } from '@/components/ui/OptionCard'
import { updateDraft } from '../draft'
import type { StepProps } from './types'

export function HotelStep({ draft, next }: StepProps) {
  return (
    <div className="space-y-3" role="radiogroup" aria-label="בחירת מלון">
      <OptionCard
        selected={draft.hotelMode === 'pick_for_me'}
        onSelect={() => {
          updateDraft({ hotelMode: 'pick_for_me' })
          next()
        }}
        icon={<Sparkles className="size-5" />}
        title="תבחרו לי לפי הרמה"
        hint="נמצא מלון שמתאים למה שתספרו לנו בהמשך"
      />
      <OptionCard
        selected={draft.hotelMode === 'specific'}
        onSelect={() => updateDraft({ hotelMode: 'specific' })}
        icon={<Hotel className="size-5" />}
        title="כן, יש לי מלון"
        hint="נבדוק בשבילכם את המחיר אצל הספקים שלנו"
      />
      {draft.hotelMode === 'specific' && (
        <div className="animate-rise pt-2">
          <label htmlFor="hotel-name" className="mb-2 block font-medium">
            שם המלון
          </label>
          <input
            id="hotel-name"
            autoFocus
            enterKeyHint="next"
            value={draft.hotelName}
            onChange={(e) => updateDraft({ hotelName: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.hotelName.trim().length >= 2) next()
            }}
            placeholder="למשל Lindos Blu"
            className="h-14 w-full rounded-field bg-white px-4 text-lg ring-1 ring-lagoon-200 outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-turquoise-400"
          />
        </div>
      )}
    </div>
  )
}
