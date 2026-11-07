import { formatDateRange, formatPrice } from '@/lib/format'
import { formatDeadline } from '@/lib/time'

/** wa.me link to a customer's phone (+E.164) with a prefilled message. */
export function customerWhatsapp(phoneE164: string, text?: string): string {
  const base = `https://wa.me/${phoneE164.replace(/\D/g, '')}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

export function offerLink(token: string): string {
  return `${window.location.origin}/o/${token}`
}

export function offerMessage(args: {
  firstName: string
  destination: string
  hotelName: string
  stars: number | null
  checkIn: string
  checkOut: string
  price: number
  token: string
  hasAlternative: boolean
  /** When the link stops taking bookings; defaults to what sending now gives. */
  expiresAt?: string | null
}): string {
  const until = args.expiresAt ?? expectedExpiry(args.checkIn)
  const stars = args.stars ? ` ${'⭐'.repeat(args.stars)}` : ''
  return [
    `היי ${args.firstName}, ההצעה שלכם ל${args.destination} מוכנה 🌴`,
    '',
    `${args.hotelName}${stars}`,
    `${formatDateRange(args.checkIn, args.checkOut)}, ${formatPrice(args.price)} לכל השהייה`,
    args.hasAlternative ? 'הוספנו גם מלון חלופי להשוואה.' : null,
    '',
    `לצפייה ולהזמנה: ${offerLink(args.token)}`,
    `ההצעה בתוקף עד ${formatDeadline(until)}.`,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

/** Mirrors the database: 24 hours from sending, but never past the end of the arrival day. */
export function expectedExpiry(checkIn: string, now = Date.now()): string {
  const dayAfterArrival = new Date(`${checkIn}T00:00:00`)
  dayAfterArrival.setDate(dayAfterArrival.getDate() + 1)
  return new Date(Math.min(now + 24 * 3_600_000, dayAfterArrival.getTime())).toISOString()
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}
