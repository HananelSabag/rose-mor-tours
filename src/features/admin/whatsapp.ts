import { formatDateRange, formatPrice } from '@/lib/format'

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
}): string {
  const stars = args.stars ? ` ${'⭐'.repeat(args.stars)}` : ''
  return [
    `היי ${args.firstName}, ההצעה שלכם ל${args.destination} מוכנה 🌴`,
    '',
    `${args.hotelName}${stars}`,
    `${formatDateRange(args.checkIn, args.checkOut)}, ${formatPrice(args.price)} לכל השהייה`,
    args.hasAlternative ? 'הוספנו גם מלון חלופי להשוואה.' : null,
    '',
    `לצפייה ולהזמנה: ${offerLink(args.token)}`,
    'ההצעה בתוקף ל־24 שעות.',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}
