import { BedDouble, CalendarDays, MapPin, ShieldCheck, Star, Users, Utensils, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDate, formatDateRange, formatPrice, nightsBetween, pluralNights } from '@/lib/format'
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
        <div className="text-sm text-ink-soft">{label}</div>
        <div className="font-semibold leading-snug">{children}</div>
      </div>
    </div>
  )
}

export function PriceBlock({ offer }: { offer: Pick<PublicOffer, 'price_ils' | 'market_price_ils' | 'market_price_source' | 'check_in' | 'check_out'> }) {
  const nights = Math.max(1, nightsBetween(offer.check_in, offer.check_out))
  const savings = offer.market_price_ils && offer.market_price_ils > offer.price_ils ? offer.market_price_ils - offer.price_ils : null
  return (
    <section aria-label="מחיר" className="rounded-sheet bg-linear-to-b from-sun-100 to-white p-5 ring-1 ring-sun-300/60">
      {savings && offer.market_price_ils && (
        <div className="flex items-baseline justify-between text-ink-soft">
          <span>המחיר ברשת</span>
          <s className="tabular text-lg">{formatPrice(offer.market_price_ils)}</s>
        </div>
      )}
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-lg font-semibold">המחיר שלנו</span>
        <span className="tabular text-[2.4rem] leading-none font-extrabold text-ocean-900">{formatPrice(offer.price_ils)}</span>
      </div>
      <div className="mt-1 text-end text-sm text-ink-soft">
        לכל השהייה. בערך <span className="tabular">{formatPrice(Math.round(offer.price_ils / nights))}</span> ללילה
      </div>
      {savings && (
        <p className="mt-3 rounded-full bg-coral-600 px-4 py-2 text-center font-bold text-white">
          חוסכים <span className="tabular">{formatPrice(savings)}</span>
        </p>
      )}
      {savings && offer.market_price_source && (
        <p className="mt-2 text-center text-xs text-ink-soft">המחיר ברשת נבדק ב: {offer.market_price_source}</p>
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
  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-[1.9rem] leading-tight font-extrabold text-ocean-950 md:text-4xl">{offer.hotel_name}</h1>
          <Stars count={offer.stars} className="size-5" />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-ink-soft">
          <MapPin className="size-4 text-turquoise-500" />
          {offer.city === offer.country ? offer.city : `${offer.city}, ${offer.country}`}
        </p>
        {offer.highlights.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {offer.highlights.map((h) => (
              <li key={h} className="rounded-full bg-lagoon-100 px-3 py-1.5 text-sm font-medium text-ocean-800">
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
          <span className="block text-sm font-normal text-ink-soft">{pluralNights(nights)}</span>
        </Fact>
        <Fact icon={BedDouble} label="חדר">{offer.room_type}</Fact>
        <Fact icon={Utensils} label="ארוחות">{BOARD_BASIS[offer.board_basis].label}</Fact>
        {guests && <Fact icon={Users} label="אורחים">{guests}</Fact>}
      </div>

      <PriceBlock offer={offer} />

      {(offer.free_cancellation_until || offer.cancellation_policy) && (
        <section className="rounded-sheet bg-white p-5 ring-1 ring-lagoon-200">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-turquoise-500" />
            מדיניות ביטול
          </h2>
          {offer.free_cancellation_until && (
            <p className="font-medium text-ocean-800">
              ביטול חינם עד {formatDate(offer.free_cancellation_until.slice(0, 10))}
            </p>
          )}
          {offer.cancellation_policy && <p className="mt-1 whitespace-pre-line text-ink-soft">{offer.cancellation_policy}</p>}
        </section>
      )}
    </div>
  )
}
