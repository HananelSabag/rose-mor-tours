import { useState } from 'react'
import { normalizePhone } from '@/lib/format'
import { updateDraft } from '../draft'
import type { StepProps } from './types'

const field =
  'h-14 w-full rounded-field bg-white px-4 text-lg ring-1 outline-none transition placeholder:text-ink-faint focus:ring-2 focus:ring-turquoise-400'

export function ContactStep({ draft }: StepProps) {
  const [phoneTouched, setPhoneTouched] = useState(false)
  const phoneInvalid = phoneTouched && draft.contactPhone.trim() !== '' && normalizePhone(draft.contactPhone) === null

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="contact-name" className="mb-2 block font-medium">
          שם
        </label>
        <input
          id="contact-name"
          autoComplete="name"
          enterKeyHint="next"
          value={draft.contactName}
          onChange={(e) => updateDraft({ contactName: e.target.value })}
          className={`${field} ring-lagoon-200`}
        />
      </div>

      <div>
        <label htmlFor="contact-phone" className="mb-2 block font-medium">
          טלפון נייד
        </label>
        <input
          id="contact-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          enterKeyHint="send"
          placeholder="050-123-4567"
          value={draft.contactPhone}
          onChange={(e) => updateDraft({ contactPhone: e.target.value })}
          onBlur={() => setPhoneTouched(true)}
          aria-invalid={phoneInvalid}
          aria-describedby="contact-phone-help"
          className={`${field} text-end ${phoneInvalid ? 'ring-coral-500' : 'ring-lagoon-200'}`}
        />
        <p id="contact-phone-help" className={`mt-2 text-sm ${phoneInvalid ? 'text-coral-600' : 'text-ink-soft'}`}>
          {phoneInvalid ? 'צריך מספר נייד, למשל 050-123-4567' : 'ההצעה תגיע לוואטסאפ במספר הזה'}
        </p>
      </div>

      <p className="rounded-field bg-lagoon-100 px-4 py-3 text-sm leading-relaxed text-ocean-900">
        אנחנו משתמשים בשם ובטלפון רק כדי לשלוח לכם את ההצעה ולתאם את ההזמנה.
      </p>
    </div>
  )
}
