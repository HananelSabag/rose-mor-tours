export const BUSINESS = {
  name: 'Rose&Mor tours',
  phoneDisplay: '050-000-0000',
  phoneE164: '+972500000000',
} as const

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${BUSINESS.phoneE164.slice(1)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
