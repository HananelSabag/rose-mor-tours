import { formatPhone } from './format'

// The WhatsApp number comes from VITE_BUSINESS_PHONE in .env (E.164, see .env.example).
const phoneE164 = import.meta.env.VITE_BUSINESS_PHONE

export const BUSINESS = {
  name: 'Rose&Mor tours',
  phoneDisplay: formatPhone(phoneE164),
  phoneE164,
} as const

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${BUSINESS.phoneE164.slice(1)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
