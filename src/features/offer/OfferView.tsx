import { BedDouble, CalendarDays, MapPin, ShieldCheck, Star, Users, Utensils, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatDate, formatDateRange, formatPrice, nightsBetween, pluralNights, toISODate } from '@/lib/format'
import { BOARD_BASIS } from '@/lib/labels'
import type { PublicOffer } from './types'

export function Stars({ count, className = 'size-4' }: { count: number | null; className?: string }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${count} כוכבים`} role="img">
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} className={`${className} fill-sun-400 text-sun-400`} aria-hidden="true" />
      ))}
    </span>
  )
}

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lagoon-100 text-ocean-700">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] text-ink-soft">{label}</div>
        <div className="text-[15px] leading-snug font-semibold">{children}</div>
      </div>
    </div>
  )
}

export function PriceBlock({ offer }: { offer: Pick<PublicOffer, 'price_ils' | 'market_price_ils' | 'market_price_source' | 'check_in' | 'check_out'> }) {
  const nights = Math.max(1, nightsBetween(offer.check_in, offer.check_out))
  const savings = offer.market_price_ils && offer.market_price_ils > offer.price_ils ? offer.market_price_ils - offer.price_ils : null
  return (
    <section aria-label="מחיר" className="rounded-sheet bg-white p-4 shadow-lift md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[17px] font-semibold text-ocean-950">המחיר שלנו</span>
        <span className="tabular text-[2rem] leading-none font-bold text-ocean-950">{formatPrice(offer.price_ils)}</span>
      </div>
      <p className="mt-1 text-end text-[13px] text-ink-soft">
        לכל השהייה. בערך <span className="tabular">{formatPrice(Math.round(offer.price_ils / nights))}</span> ללילה
      </p>
      {savings && offer.market_price_ils && (
        <div className="mt-3 border-t border-lagoon-100 pt-3">
          <p className="flex items-baseline justify-between gap-3 text-[15px] text-ink-soft">
            <span>המחיר ברשת</span>
            <s className="tabular">{formatPrice(offer.market_price_ils)}</s>
          </p>
          <p className="mt-0.5 text-end text-[15px] font-semibold text-ocean-700">
            חוסכים <span className="tabular">{formatPrice(savings)}</span>
          </p>
          {offer.market_price_source && <p className="mt-1 text-[13px] text-ink-faint">המחיר ברשת נבדק ב: {offer.market_price_source}</p>}
        </div>
      )}
    </section>
  )
}

type Props = {
  offer: PublicOffer
  /** e.g. "שני מבוגרים וילד (5)" */
  guests?: string
  /** A personal line under the hotel header (never above it). */
  intro?: ReactNode
}

/** The body of an offer: everything except the page chrome and the actions. */
export function OfferView({ offer, guests, intro }: Props) {
  const nights = nightsBetween(offer.check_in, offer.check_out)
  const [today] = useState(() => toISODate(new Date()))
  const freeUntil = offer.free_cancellation_until?.slice(0, 10) ?? null
  const freeOver = !!freeUntil && freeUntil < today
  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-[1.75rem] leading-tight font-bold text-ocean-950 md:text-4xl" dir="auto">
            {offer.hotel_name}
          </h1>
          <Stars count={offer.stars} className="size-5" />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[15px] text-ink-soft">
          <MapPin className="size-4 text-turquoise-500" />
          {offer.city === offer.country ? offer.city : `${offer.city}, ${offer.country}`}
        </p>
        {offer.highlights.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {offer.highlights.map((h) => (
              <li key={h} className="rounded-full bg-lagoon-100 px-3 py-1.5 text-[13px] font-medium text-ocean-800">
                {h}
              </li>
            ))}
          </ul>
        )}
        {intro && <div className="mt-4">{intro}</div>}
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Fact icon={CalendarDays} label="תאריכים">
          {formatDateRange(offer.check_in, offer.check_out)}
          <span className="block text-[13px] font-normal text-ink-soft">{pluralNights(nights)}</span>
        </Fact>
        <Fact icon={BedDouble} label="חדר">{offer.room_type}</Fact>
        <Fact icon={Utensils} label="ארוחות">{BOARD_BASIS[offer.board_basis].label}</Fact>
        {guests && <Fact icon={Users} label="אורחים">{guests}</Fact>}
      </div>

      <PriceBlock offer={offer} />

      {/* Always said out loud: free cancellation until a date, or none at all. */}
      <section className="rounded-sheet bg-white p-4 shadow-lift md:p-5">
        <h2 className="mb-2 flex items-center gap-2 text-[17px] font-semibold text-ocean-950">
          <ShieldCheck className="size-5 text-turquoise-500" />
          ביטול
        </h2>
        <p className={freeUntil && !freeOver ? 'text-[15px] font-medium text-ocean-800' : 'text-[15px] font-medium text-ink'}>
          {freeUntil ? (freeOver ? `הביטול החינם הסתיים ב־${formatDate(freeUntil)}` : `ביטול חינם עד ${formatDate(freeUntil)}`) : 'אין ביטול חינם'}
        </p>
        {offer.cancellation_policy && <p className="mt-1 text-[15px] whitespace-pre-line text-ink-soft">{offer.cancellation_policy}</p>}
      </section>
    </div>
  )
}
