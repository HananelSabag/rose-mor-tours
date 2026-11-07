import type { PublicOffer } from '@/features/offer/types'
import { nightsBetween, toISODate } from '@/lib/format'
import type { BoardBasis, Offer, QuoteRequest } from '@/lib/types'

export type OfferFormValues = {
  id?: string
  hotel_name: string
  city: string
  country: string
  stars: number | null
  room_type: string
  board_basis: BoardBasis | null
  check_in: string
  check_out: string
  price: string
  market_price: string
  market_price_source: string
  /** Asked explicitly: suppliers either allow free cancellation until a date, or don't. */
  free_cancellation: 'yes' | 'no' | null
  free_cancellation_until: string
  cancellation_policy: string
  images: string[]
  highlights: string[]
}

/** "כרתים, יוון" → { city: "כרתים", country: "יוון" }; a country on its own fills both. */
export function splitDestination(destination: string) {
  const [city = '', country = ''] = destination.split(',').map((s) => s.trim())
  return { city, country: country || city }
}

export function emptyFromRequest(r: QuoteRequest): OfferFormValues {
  const { city, country } = splitDestination(r.destination)
  return {
    hotel_name: r.hotel_name ?? '',
    city,
    country,
    stars: r.min_stars,
    room_type: '',
    board_basis: r.board_basis,
    check_in: r.check_in,
    check_out: r.check_out,
    price: '',
    market_price: '',
    market_price_source: '',
    free_cancellation: null,
    free_cancellation_until: '',
    cancellation_policy: '',
    images: [],
    highlights: [],
  }
}

export function fromOffer(o: Offer): OfferFormValues {
  return {
    id: o.id,
    hotel_name: o.hotel_name,
    city: o.city,
    country: o.country,
    stars: o.stars,
    room_type: o.room_type,
    board_basis: o.board_basis,
    check_in: o.check_in,
    check_out: o.check_out,
    price: String(o.price_ils),
    market_price: o.market_price_ils ? String(o.market_price_ils) : '',
    market_price_source: o.market_price_source ?? '',
    free_cancellation: o.free_cancellation_until ? 'yes' : 'no',
    free_cancellation_until: o.free_cancellation_until?.slice(0, 10) ?? '',
    cancellation_policy: o.cancellation_policy ?? '',
    images: o.images,
    highlights: o.highlights,
  }
}

export const num = (v: string) => Number(v.replace(/[^\d.]/g, ''))

export type FieldErrors = Partial<Record<keyof OfferFormValues, string>>

/**
 * What makes an offer impossible, not just unusual. Each message is short: it is listed
 * next to the save button ("חסר: ...") and shown under its field.
 */
export function validate(v: OfferFormValues, today = toISODate(new Date())): FieldErrors {
  const e: FieldErrors = {}
  if (v.hotel_name.trim().length < 2) e.hotel_name = 'שם המלון'
  if (v.city.trim().length < 2) e.city = 'עיר'
  if (v.country.trim().length < 2) e.country = 'מדינה'
  if (v.room_type.trim().length < 2) e.room_type = 'סוג החדר'
  if (!v.board_basis) e.board_basis = 'ארוחות'

  if (!v.check_in) e.check_in = 'תאריך הגעה'
  else if (v.check_in < today) e.check_in = 'תאריך ההגעה עבר'
  if (!v.check_out || (v.check_in && v.check_out <= v.check_in)) e.check_out = 'העזיבה צריכה להיות אחרי ההגעה'

  const price = num(v.price)
  if (!(price > 0)) e.price = 'מחיר'
  if (v.market_price) {
    const market = num(v.market_price)
    if (!(market > 0)) e.market_price = 'המחיר ברשת'
    else if (price > 0 && market <= price) e.market_price = 'המחיר ברשת צריך להיות גבוה משלנו'
    if (v.market_price_source.trim().length < 2) e.market_price_source = 'איפה נבדק המחיר ברשת'
  }

  if (!v.free_cancellation) e.free_cancellation = 'יש ביטול חינם?'
  else if (v.free_cancellation === 'yes') {
    if (!v.free_cancellation_until) e.free_cancellation_until = 'עד מתי ביטול חינם'
    else if (v.free_cancellation_until < today) e.free_cancellation_until = 'תאריך הביטול עבר'
    else if (v.check_in && v.free_cancellation_until > v.check_in) e.free_cancellation_until = 'ביטול חינם רק עד יום ההגעה'
  }
  return e
}

/** Allowed but worth a second look: the offer strays from what the customer asked for. */
export function outsideRequest(v: OfferFormValues, r: Pick<QuoteRequest, 'check_in' | 'check_out' | 'flexible_days'>): boolean {
  if (!v.check_in || !v.check_out) return false
  const shift = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00`)
    d.setDate(d.getDate() + days)
    return toISODate(d)
  }
  const flex = r.flexible_days ?? 0
  const inWindow = (value: string, target: string) => value >= shift(target, -flex) && value <= shift(target, flex)
  return !inWindow(v.check_in, r.check_in) || !inWindow(v.check_out, r.check_out)
}

export function perNight(v: Pick<OfferFormValues, 'price' | 'check_in' | 'check_out'>): number | null {
  const nights = v.check_in && v.check_out && v.check_out > v.check_in ? nightsBetween(v.check_in, v.check_out) : 0
  const price = num(v.price)
  return nights > 0 && price > 0 ? Math.round(price / nights) : null
}

export function toRow(v: OfferFormValues) {
  const free = v.free_cancellation === 'yes'
  return {
    hotel_name: v.hotel_name.trim(),
    city: v.city.trim(),
    country: v.country.trim(),
    stars: v.stars,
    room_type: v.room_type.trim(),
    board_basis: v.board_basis!,
    check_in: v.check_in,
    check_out: v.check_out,
    price_ils: num(v.price),
    market_price_ils: v.market_price ? num(v.market_price) : null,
    market_price_source: v.market_price ? v.market_price_source.trim() : null,
    free_cancellation_until: free ? v.free_cancellation_until || null : null,
    cancellation_policy: v.cancellation_policy.trim() || null,
    images: v.images,
    highlights: v.highlights,
  }
}

/** For the live preview: what the customer would see with the current values. */
export function toPreview(v: OfferFormValues): PublicOffer {
  return {
    id: v.id ?? 'preview',
    status: 'sent',
    hotel_name: v.hotel_name || 'שם המלון',
    city: v.city || 'עיר',
    country: v.country || 'מדינה',
    stars: v.stars,
    room_type: v.room_type || 'סוג החדר',
    board_basis: v.board_basis ?? 'BB',
    check_in: v.check_in,
    check_out: v.check_out > v.check_in ? v.check_out : v.check_in,
    price_ils: num(v.price) || 0,
    market_price_ils: v.market_price ? num(v.market_price) : null,
    market_price_source: v.market_price_source || null,
    cancellation_policy: v.free_cancellation ? v.cancellation_policy || null : null,
    free_cancellation_until: v.free_cancellation === 'yes' ? v.free_cancellation_until || null : null,
    images: v.images,
    highlights: v.highlights,
    expires_at: null,
  }
}

export const HIGHLIGHT_SUGGESTIONS = ['על החוף', 'בריכה', 'ספא', 'מועדון ילדים', 'נוף לים', 'למבוגרים בלבד', 'מרכז העיר', 'חניה חינם']

/** How suppliers usually name rooms; the field stays free text. */
export const ROOM_TYPE_SUGGESTIONS = [
  'Double Room',
  'Superior Double Room',
  'Deluxe Room',
  'Double Room Sea View',
  'Superior Room Sea View',
  'Family Room',
  'Family Suite',
  'Junior Suite',
  'Suite',
  'Bungalow',
  'Studio',
  'Apartment',
  'Twin Room',
  'Triple Room',
]
