import type { BoardBasis, RoomSetup } from '@/lib/types'

/** What a customer may see of an offer (mirrors private.offer_public_json). */
export type PublicOffer = {
  id: string
  status: 'draft' | 'sent' | 'accepted' | 'withdrawn'
  hotel_name: string
  city: string
  country: string
  stars: number | null
  room_type: string
  board_basis: BoardBasis
  check_in: string
  check_out: string
  price_ils: number
  market_price_ils: number | null
  market_price_source: string | null
  cancellation_policy: string | null
  free_cancellation_until: string | null
  images: string[]
  highlights: string[]
  expires_at: string | null
}

export type OfferPayload = {
  offer: PublicOffer
  alternatives: PublicOffer[]
  request: {
    destination: string
    adults: number
    children_ages: number[]
    room_setup: RoomSetup
    first_name: string
  }
  my_booking_id: string | null
  taken: boolean
}
