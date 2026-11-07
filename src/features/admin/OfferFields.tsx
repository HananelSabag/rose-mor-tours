import clsx from 'clsx'
import { History, ImagePlus, LoaderCircle, MapPin, Plus, RotateCcw, Star, TriangleAlert, X } from 'lucide-react'
import { useId, useState, type ChangeEvent, type ReactNode } from 'react'
import { Chip } from '@/components/ui/Chip'
import { formatDate, formatDateRange, formatPrice, nightsBetween, pluralNights, toISODate } from '@/lib/format'
import { HOTEL_IMAGE, compressImage } from '@/lib/images'
import { BOARD_BASIS } from '@/lib/labels'
import { fileExtension, hotelImageUrl } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import type { BoardBasis, QuoteRequest } from '@/lib/types'
import { matchHotels, usePastHotels, type HotelSuggestion } from './hotelSuggestions'
import { HIGHLIGHT_SUGGESTIONS, ROOM_TYPE_SUGGESTIONS, outsideRequest, perNight, type FieldErrors, type OfferFormValues } from './offerForm'

const input =
  'h-12 w-full rounded-field bg-white px-4 text-[15px] ring-1 ring-lagoon-200 outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ocean-700 aria-invalid:ring-2 aria-invalid:ring-coral-600 disabled:bg-lagoon-50 disabled:text-ink-faint'

function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[13px] text-coral-700">{error}</span> : hint && <span className="mt-1 block text-[13px] text-ink-faint">{hint}</span>}
    </label>
  )
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="rounded-sheet bg-white p-4 shadow-lift md:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-ocean-950">{title}</h2>
        {aside}
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}

/** Type a few letters, pick a hotel: city, country and stars follow (and photos, if offered before). */
function HotelCombobox({ value, city, invalid, onPick, onType }: { value: string; city: string; invalid: boolean; onPick: (h: HotelSuggestion) => void; onType: (name: string) => void }) {
  const listId = useId()
  const past = usePastHotels()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const options = matchHotels(value, past.data ?? [], city)
  const show = open && options.length > 0

  const pick = (h: HotelSuggestion) => {
    onPick(h)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        dir="auto"
        autoComplete="off"
        value={value}
        placeholder="מתחילים להקליד, או בוחרים מהרשימה"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          onType(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (!show) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => (i + 1) % options.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => (i - 1 + options.length) % options.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            pick(options[active]!)
          } else if (e.key === 'Escape') setOpen(false)
        }}
        className={`${input} text-[17px] font-semibold`}
      />
      {show && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-80 overflow-auto rounded-field bg-white py-1.5 shadow-glass ring-1 ring-lagoon-200">
          {options.map((h, i) => (
            <li
              key={`${h.source}-${h.name}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(h)
              }}
              onMouseEnter={() => setActive(i)}
              className={clsx('flex cursor-pointer items-center gap-3 px-3 py-2.5', i === active && 'bg-lagoon-50')}
            >
              {h.source === 'past' ? <History className="size-4 shrink-0 text-turquoise-500" aria-label="הוצע בעבר" /> : <MapPin className="size-4 shrink-0 text-ink-faint" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold" dir="auto">
                  {h.name}
                </span>
                <span className="block truncate text-[13px] text-ink-soft">
                  {[h.area, h.city].filter(Boolean).join(', ')}
                  {h.source === 'past' && h.images?.length ? ` · ${h.images.length} תמונות` : ''}
                </span>
              </span>
              {h.stars && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] text-ink-soft">
                  {h.stars}
                  <Star className="size-3.5 fill-sun-400 text-sun-400" />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {images.map((path, i) => (
          <li key={path} className="relative aspect-square overflow-hidden rounded-field bg-lagoon-100">
            <img src={hotelImageUrl(path)} alt="" className="size-full object-cover" />
            {i === 0 ? (
              <span className="absolute start-1.5 top-1.5 rounded-full bg-ocean-900/80 px-2 py-0.5 text-xs font-medium text-white">שער</span>
            ) : (
              <button
                type="button"
                onClick={() => onChange([path, ...images.filter((p) => p !== path)])}
                className="absolute start-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-ocean-800 shadow"
                aria-label="להפוך לתמונת שער"
                title="להפוך לתמונת שער"
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
            <label className="grid aspect-square cursor-pointer place-items-center rounded-field bg-lagoon-50 text-ocean-700 ring-1 ring-lagoon-200 transition hover:bg-lagoon-100">
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
      <p className={clsx('mt-2 text-[13px]', failed ? 'text-coral-700' : 'text-ink-faint')}>
        {failed ? 'חלק מהתמונות לא עלו. נסו שוב.' : 'עד 12 תמונות, נדחסות אוטומטית. הראשונה היא תמונת השער.'}
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
      <div className="flex flex-wrap gap-2">
        {value.map((h) => (
          <span key={h} className="inline-flex h-9 items-center gap-1 rounded-full bg-lagoon-100 ps-3 pe-1 text-[15px] font-medium text-ocean-900">
            {h}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== h))} className="grid size-7 place-items-center rounded-full hover:bg-white" aria-label={`הסרת ${h}`}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        {HIGHLIGHT_SUGGESTIONS.filter((s) => !value.includes(s)).map((s) => (
          <button key={s} type="button" onClick={() => add(s)} className="h-9 rounded-full px-3 text-[15px] text-ocean-700 ring-1 ring-lagoon-200 transition hover:bg-lagoon-50">
            + {s}
          </button>
        ))}
      </div>
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
          placeholder="משהו אחר, למשל: בריכה מחוממת"
          className={input}
          maxLength={40}
        />
        <button type="button" onClick={() => add(draft)} className="grid size-12 shrink-0 place-items-center rounded-field bg-white text-ocean-800 ring-1 ring-lagoon-200" aria-label="הוספה">
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  )
}

function Segmented<T extends string>({ value, options, onChange, invalid, label }: { value: T | null; options: { id: T; label: string }[]; onChange: (v: T) => void; invalid?: boolean; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('grid grid-cols-2 gap-1 rounded-field bg-lagoon-50 p-1', invalid && 'ring-2 ring-coral-600')}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={clsx('h-11 rounded-[0.6rem] text-[15px] font-semibold transition', value === o.id ? 'bg-white text-ocean-950 shadow-lift' : 'text-ink-soft hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

type Props = {
  request: QuoteRequest
  values: OfferFormValues
  errors: FieldErrors
  onChange: (patch: Partial<OfferFormValues>) => void
}

export function OfferFields({ request, values: v, errors, onChange }: Props) {
  // Fixed for the life of the form; a form left open past midnight still validates on save.
  const [today] = useState(() => toISODate(new Date()))
  const bind = (key: 'city' | 'country' | 'room_type' | 'price' | 'market_price' | 'market_price_source' | 'check_in' | 'check_out' | 'free_cancellation_until') => ({
    value: v[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ [key]: e.target.value }),
    'aria-invalid': errors[key] ? true : undefined,
  })

  const nights = v.check_in && v.check_out && v.check_out > v.check_in ? nightsBetween(v.check_in, v.check_out) : 0
  const night = perNight(v)
  const strays = outsideRequest(v, request)
  const sameAsRequest = v.check_in === request.check_in && v.check_out === request.check_out
  const daysBefore = v.free_cancellation_until && v.check_in ? nightsBetween(v.free_cancellation_until, v.check_in) : null

  return (
    <div className="space-y-4">
      <Section title="המלון">
        <Field label="שם המלון" error={errors.hotel_name && 'צריך שם מלון'}>
          <HotelCombobox
            value={v.hotel_name}
            city={v.city}
            invalid={!!errors.hotel_name}
            onType={(hotel_name) => onChange({ hotel_name })}
            onPick={(h) =>
              onChange({
                hotel_name: h.name,
                city: h.city || v.city,
                country: h.country || v.country,
                stars: h.stars ?? v.stars,
                // A hotel offered before brings its photos and highlights, unless some are already here.
                ...(h.images?.length && v.images.length === 0 ? { images: h.images } : {}),
                ...(h.highlights?.length && v.highlights.length === 0 ? { highlights: h.highlights } : {}),
              })
            }
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="עיר או אזור" error={errors.city}>
            <input {...bind('city')} className={input} />
          </Field>
          <Field label="מדינה" error={errors.country}>
            <input {...bind('country')} className={input} />
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">כוכבים</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="כוכבים">
            {[2, 3, 4, 5].map((n) => (
              <Chip key={n} role="radio" selected={v.stars === n} onToggle={() => onChange({ stars: v.stars === n ? null : n })}>
                <Star className="size-4 fill-sun-400 text-sun-400" /> {n}
              </Chip>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="תאריכים וחדר"
        aside={
          !sameAsRequest && (
            <button type="button" onClick={() => onChange({ check_in: request.check_in, check_out: request.check_out })} className="inline-flex items-center gap-1 text-[13px] font-medium text-ocean-700 hover:underline">
              <RotateCcw className="size-3.5" /> לתאריכי הבקשה
            </button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="הגעה" error={errors.check_in}>
            <input
              type="date"
              min={today}
              {...bind('check_in')}
              onChange={(e) => {
                const check_in = e.target.value
                // Keep the stay length when the arrival moves.
                const keep = nights && check_in ? (() => {
                  const d = new Date(`${check_in}T00:00:00`)
                  d.setDate(d.getDate() + nights)
                  return toISODate(d)
                })() : v.check_out
                onChange({ check_in, check_out: keep })
              }}
              className={input}
            />
          </Field>
          <Field label="עזיבה" error={errors.check_out}>
            <input type="date" min={v.check_in || today} {...bind('check_out')} className={input} />
          </Field>
        </div>
        <p className={clsx('flex items-start gap-1.5 text-[13px]', strays ? 'text-sun-ink' : 'text-ink-soft')}>
          {strays && <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          <span>
            {nights > 0 && <strong className="font-semibold">{pluralNights(nights)}. </strong>}
            הלקוח ביקש {formatDateRange(request.check_in, request.check_out)}
            {request.flexible_days ? ` (גמיש ±${request.flexible_days})` : ''}
            {strays ? '. התאריכים שונים מהבקשה, כדאי לוודא איתו.' : '.'}
          </span>
        </p>

        <Field label="סוג החדר" hint="כמו שהספק כותב" error={errors.room_type}>
          <input {...bind('room_type')} dir="auto" list="room-types" placeholder="למשל Double Room Sea View" className={input} />
          <datalist id="room-types">
            {ROOM_TYPE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">
            ארוחות{request.board_basis ? ` · הלקוח ביקש ${BOARD_BASIS[request.board_basis].label}` : ''}
          </span>
          <div className={clsx('flex flex-wrap gap-2 rounded-field', errors.board_basis && 'ring-2 ring-coral-600 ring-offset-4')} role="radiogroup" aria-label="בסיס אירוח">
            {(Object.keys(BOARD_BASIS) as BoardBasis[]).map((key) => (
              <Chip key={key} role="radio" selected={v.board_basis === key} onToggle={() => onChange({ board_basis: key })}>
                {BOARD_BASIS[key].label}
              </Chip>
            ))}
          </div>
        </div>
      </Section>

      <Section title="מחיר">
        <Field
          label="המחיר שלנו, בשקלים, לכל השהייה"
          error={errors.price && 'צריך מחיר'}
          hint={night ? `בערך ${formatPrice(night)} ללילה` : undefined}
        >
          <input inputMode="decimal" dir="ltr" {...bind('price')} placeholder="0" className={`${input} tabular text-end text-[19px] font-semibold`} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="המחיר ברשת (לא חובה)" hint="רק מחיר אמיתי שבדקתם, לאותו חדר ותאריכים" error={errors.market_price}>
            <input inputMode="decimal" dir="ltr" {...bind('market_price')} className={`${input} tabular text-end`} />
          </Field>
          <Field label="איפה נבדק" hint="מוצג ללקוח, למשל Booking.com" error={errors.market_price_source}>
            <input {...bind('market_price_source')} className={input} disabled={!v.market_price} />
          </Field>
        </div>
      </Section>

      <Section title="ביטול">
        <Segmented
          label="ביטול חינם"
          value={v.free_cancellation}
          invalid={!!errors.free_cancellation}
          options={[
            { id: 'yes', label: 'יש ביטול חינם' },
            { id: 'no', label: 'אין ביטול חינם' },
          ]}
          onChange={(free_cancellation) => onChange({ free_cancellation })}
        />
        {errors.free_cancellation && <p className="text-[13px] text-coral-700">בחרו אם הספק מאפשר ביטול חינם</p>}
        {v.free_cancellation === 'yes' && (
          <Field
            label="ביטול חינם עד"
            error={errors.free_cancellation_until}
            hint={daysBefore !== null && daysBefore >= 0 ? (daysBefore === 0 ? 'עד יום ההגעה' : `${daysBefore} ימים לפני ההגעה (${formatDate(v.check_in)})`) : undefined}
          >
            <input type="date" min={today} max={v.check_in || undefined} {...bind('free_cancellation_until')} className={input} />
          </Field>
        )}
        {v.free_cancellation && (
          <Field label={v.free_cancellation === 'yes' ? 'ומה אחרי התאריך? (לא חובה)' : 'תנאי הביטול (לא חובה)'}>
            <textarea
              rows={2}
              value={v.cancellation_policy}
              onChange={(e) => onChange({ cancellation_policy: e.target.value })}
              placeholder={v.free_cancellation === 'yes' ? 'למשל: דמי ביטול של לילה ראשון' : 'למשל: ללא החזר כספי'}
              className="w-full resize-y rounded-field bg-white p-3 text-[15px] ring-1 ring-lagoon-200 outline-none focus:ring-2 focus:ring-ocean-700"
            />
          </Field>
        )}
      </Section>

      <Section title="תמונות ומה מיוחד" aside={<span className="text-[13px] text-ink-faint">לא חובה, אבל מוכר</span>}>
        <ImagesField requestId={request.id} images={v.images} onChange={(images) => onChange({ images })} />
        <HighlightsField value={v.highlights} onChange={(highlights) => onChange({ highlights })} />
      </Section>
    </div>
  )
}
