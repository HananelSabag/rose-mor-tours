import type { PublicOffer } from '@/features/offer/types'
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
  cancellation_policy: string
  free_cancellation_until: string
  images: string[]
  highlights: string[]
}

export function emptyFromRequest(r: QuoteRequest): OfferFormValues {
  // "כרתים, יוון" → city "כרתים", country "יוון"
  const [city = '', country = ''] = r.destination.split(',').map((s) => s.trim())
  return {
    hotel_name: r.hotel_name ?? '',
    city,
    country: country || city,
    stars: r.min_stars,
    room_type: '',
    board_basis: r.board_basis,
    check_in: r.check_in,
    check_out: r.check_out,
    price: '',
    market_price: '',
    market_price_source: '',
    cancellation_policy: '',
    free_cancellation_until: '',
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
    cancellation_policy: o.cancellation_policy ?? '',
    free_cancellation_until: o.free_cancellation_until?.slice(0, 10) ?? '',
    images: o.images,
    highlights: o.highlights,
  }
}

const num = (v: string) => Number(v.replace(/[^\d.]/g, ''))

export type FieldErrors = Partial<Record<keyof OfferFormValues, string>>

export function validate(v: OfferFormValues): FieldErrors {
  const e: FieldErrors = {}
  if (v.hotel_name.trim().length < 2) e.hotel_name = 'שם המלון'
  if (v.city.trim().length < 2) e.city = 'עיר'
  if (v.country.trim().length < 2) e.country = 'מדינה'
  if (v.room_type.trim().length < 2) e.room_type = 'סוג החדר'
  if (!v.board_basis) e.board_basis = 'ארוחות'
  if (!v.check_in || !v.check_out || v.check_out <= v.check_in) e.check_out = 'תאריכים'
  if (!(num(v.price) > 0)) e.price = 'מחיר'
  if (v.market_price && !(num(v.market_price) > 0)) e.market_price = 'המחיר ברשת'
  if (v.market_price && v.market_price_source.trim().length < 2) e.market_price_source = 'מקור המחיר ברשת'
  return e
}

export function toRow(v: OfferFormValues) {
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
    cancellation_policy: v.cancellation_policy.trim() || null,
    free_cancellation_until: v.free_cancellation_until || null,
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
    cancellation_policy: v.cancellation_policy || null,
    free_cancellation_until: v.free_cancellation_until || null,
    images: v.images,
    highlights: v.highlights,
    expires_at: null,
  }
}

export const HIGHLIGHT_SUGGESTIONS = [
  'על החוף',
  'בריכה',
  'ספא',
  'מועדון ילדים',
  'נוף לים',
  'למבוגרים בלבד',
  'מרכז העיר',
  'חניה חינם',
]
