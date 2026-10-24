import clsx from 'clsx'
import { ImagePlus, LoaderCircle, Plus, Star, X } from 'lucide-react'
import { useState, type ChangeEvent, type ReactNode } from 'react'
import { Chip } from '@/components/ui/Chip'
import { HOTEL_IMAGE, compressImage } from '@/lib/images'
import { BOARD_BASIS } from '@/lib/labels'
import { fileExtension, hotelImageUrl } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import type { BoardBasis } from '@/lib/types'
import { HIGHLIGHT_SUGGESTIONS, type FieldErrors, type OfferFormValues } from './offerForm'

const input =
  'h-12 w-full rounded-field bg-white px-4 text-base ring-1 ring-lagoon-200 outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ocean-700 aria-invalid:ring-coral-600'

function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-lg font-bold text-ocean-950">{title}</legend>
      {children}
    </fieldset>
  )
}

function ImagesField({ requestId, images, onChange }: { requestId: string; images: string[]; onChange: (images: string[]) => void }) {
  const [uploading, setUploading] = useState(0)
  const [failed, setFailed] = useState(false)

  async function add(files: FileList) {
    setFailed(false)
    const list = Array.from(files).slice(0, 12 - images.length)
    setUploading(list.length)
    const added: string[] = []
    // Sequential: keeps memory low on phones while decoding big camera photos.
    for (const file of list) {
      try {
        const body = await compressImage(file, HOTEL_IMAGE)
        const path = `offers/${requestId}/${crypto.randomUUID()}.${fileExtension(body, 'jpg')}`
        const { error } = await supabase.storage.from('hotel-images').upload(path, body, { contentType: body.type, cacheControl: '31536000' })
        if (error) throw error
        added.push(path)
      } catch {
        setFailed(true)
      }
      setUploading((n) => n - 1)
    }
    onChange([...images, ...added])
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((path, i) => (
          <li key={path} className="group relative aspect-square overflow-hidden rounded-field bg-lagoon-100">
            <img src={hotelImageUrl(path)} alt="" className="size-full object-cover" />
            {i === 0 ? (
              <span className="absolute start-1.5 top-1.5 rounded-full bg-ocean-900/80 px-2 py-0.5 text-xs font-medium text-white">ראשית</span>
            ) : (
              <button
                type="button"
                onClick={() => onChange([path, ...images.filter((p) => p !== path)])}
                className="absolute start-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-ocean-800 shadow"
                aria-label="להפוך לתמונה ראשית"
                title="להפוך לתמונה ראשית"
              >
                <Star className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(images.filter((p) => p !== path))}
              className="absolute end-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-coral-700 shadow"
              aria-label="הסרת התמונה"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
        {images.length < 12 && (
          <li>
            <label className="grid aspect-square cursor-pointer place-items-center rounded-field border-2 border-dashed border-lagoon-200 text-ocean-700 transition hover:border-turquoise-400 hover:bg-white">
              {uploading > 0 ? <LoaderCircle className="size-7 animate-spin" /> : <ImagePlus className="size-7" />}
              <span className="sr-only">הוספת תמונות</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) void add(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </li>
        )}
      </ul>
      <p className={clsx('mt-2 text-xs', failed ? 'text-coral-700' : 'text-ink-faint')}>
        {failed ? 'חלק מהתמונות לא עלו. נסו שוב.' : 'עד 12 תמונות. נדחסות אוטומטית. הראשונה היא תמונת השער.'}
      </p>
    </div>
  )
}

function HighlightsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = (text: string) => {
    const t = text.trim()
    if (t && !value.includes(t) && value.length < 8) onChange([...value, t])
    setDraft('')
  }
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((h) => (
            <li key={h} className="inline-flex items-center gap-1 rounded-full bg-lagoon-100 py-1.5 ps-3 pe-1.5 text-sm font-medium text-ocean-800">
              {h}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== h))} className="grid size-6 place-items-center rounded-full hover:bg-white" aria-label={`הסרת ${h}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
          }}
          placeholder="למשל: בריכה מחוממת"
          className={input}
          maxLength={40}
        />
        <button type="button" onClick={() => add(draft)} className="grid size-12 shrink-0 place-items-center rounded-field bg-white text-ocean-800 ring-1 ring-lagoon-200" aria-label="הוספה">
          <Plus className="size-5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {HIGHLIGHT_SUGGESTIONS.filter((s) => !value.includes(s)).map((s) => (
          <button key={s} type="button" onClick={() => add(s)} className="rounded-full px-2.5 py-1 text-sm text-ocean-700 ring-1 ring-lagoon-200 hover:bg-white">
            + {s}
          </button>
        ))}
      </div>
    </div>
  )
}

type Props = {
  requestId: string
  values: OfferFormValues
  errors: FieldErrors
  onChange: (patch: Partial<OfferFormValues>) => void
}

export function OfferFields({ requestId, values: v, errors, onChange }: Props) {
  const bind = (key: 'hotel_name' | 'city' | 'country' | 'room_type' | 'price' | 'market_price' | 'market_price_source' | 'check_in' | 'check_out' | 'free_cancellation_until') => ({
    value: v[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ [key]: e.target.value }),
    'aria-invalid': errors[key] ? true : undefined,
  })

  return (
    <div className="space-y-8">
      <Section title="המלון">
        <Field label="שם המלון">
          <input {...bind('hotel_name')} className={input} />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">כוכבים</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="כוכבים">
            {[3, 4, 5].map((n) => (
              <Chip key={n} role="radio" selected={v.stars === n} onToggle={() => onChange({ stars: v.stars === n ? null : n })}>
                <Star className="size-4 fill-sun-400 text-sun-400" /> {n}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="עיר או אזור">
            <input {...bind('city')} className={input} />
          </Field>
          <Field label="מדינה">
            <input {...bind('country')} className={input} />
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">מה מיוחד במלון</span>
          <HighlightsField value={v.highlights} onChange={(highlights) => onChange({ highlights })} />
        </div>
      </Section>

      <Section title="תמונות">
        <ImagesField requestId={requestId} images={v.images} onChange={(images) => onChange({ images })} />
      </Section>

      <Section title="חדר ותאריכים">
        <Field label="סוג החדר" hint="כמו שהספק כותב, למשל Deluxe Sea View">
          <input {...bind('room_type')} className={input} />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">ארוחות</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="בסיס אירוח">
            {(Object.keys(BOARD_BASIS) as BoardBasis[]).map((key) => (
              <Chip key={key} role="radio" selected={v.board_basis === key} onToggle={() => onChange({ board_basis: key })}>
                {BOARD_BASIS[key].label}
              </Chip>
            ))}
          </div>
          {errors.board_basis && <p className="mt-1 text-sm text-coral-700">בחרו בסיס אירוח</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="הגעה">
            <input type="date" {...bind('check_in')} className={input} />
          </Field>
          <Field label="עזיבה">
            <input type="date" {...bind('check_out')} className={input} />
          </Field>
        </div>
      </Section>

      <Section title="מחיר">
        <Field label="המחיר שלנו (₪, לכל השהייה)">
          <input inputMode="decimal" dir="ltr" {...bind('price')} className={`${input} tabular text-end text-lg font-semibold`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="המחיר ברשת (₪)" hint="לא חובה. רק מחיר אמיתי שבדקתם">
            <input inputMode="decimal" dir="ltr" {...bind('market_price')} className={`${input} tabular text-end`} />
          </Field>
          <Field label="איפה נבדק" hint="מוצג ללקוח, למשל Booking.com, 22.10">
            <input {...bind('market_price_source')} className={input} disabled={!v.market_price} />
          </Field>
        </div>
      </Section>

      <Section title="ביטול">
        <Field label="ביטול חינם עד" hint="לא חובה">
          <input type="date" {...bind('free_cancellation_until')} className={input} />
        </Field>
        <Field label="מדיניות ביטול">
          <textarea
            rows={3}
            value={v.cancellation_policy}
            onChange={(e) => onChange({ cancellation_policy: e.target.value })}
            placeholder="למשל: אחרי התאריך הזה, דמי ביטול של לילה ראשון"
            className="w-full resize-y rounded-field bg-white p-4 text-base ring-1 ring-lagoon-200 outline-none focus:ring-2 focus:ring-ocean-700"
          />
        </Field>
      </Section>
    </div>
  )
}
