// Dates are stored as plain YYYY-MM-DD (no time zone). Never round-trip them through
// toISOString(), which shifts the day for anyone east of UTC.

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = parseISODate(checkOut).getTime() - parseISODate(checkIn).getTime()
  return Math.round(ms / 86_400_000)
}

const dayMonth = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' })
const dayMonthYear = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })

export function formatDate(value: string): string {
  const date = parseISODate(value)
  return (date.getFullYear() === new Date().getFullYear() ? dayMonth : dayMonthYear).format(date)
}

export function formatDateRange(checkIn: string, checkOut: string): string {
  const from = parseISODate(checkIn)
  const to = parseISODate(checkOut)
  const sameYear = from.getFullYear() === to.getFullYear()
  const thisYear = to.getFullYear() === new Date().getFullYear()
  if (sameYear && from.getMonth() === to.getMonth()) {
    const tail = (thisYear ? dayMonth : dayMonthYear).format(to)
    return `${from.getDate()}–${tail}`
  }
  const head = (sameYear ? dayMonth : dayMonthYear).format(from)
  return `${head} – ${(thisYear ? dayMonth : dayMonthYear).format(to)}`
}

export function pluralNights(n: number): string {
  if (n === 1) return 'לילה אחד'
  if (n === 2) return 'שני לילות'
  return `${n} לילות`
}

const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
export function formatPrice(amount: number): string {
  return ils.format(amount)
}

/** Accepts 05X-XXX-XXXX, 9725X..., +9725X... or any +E.164 number. Returns +E.164 or null. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, '')
  let e164: string
  if (trimmed.startsWith('+')) e164 = `+${digits}`
  else if (digits.startsWith('972')) e164 = `+${digits}`
  else if (digits.startsWith('0')) e164 = `+972${digits.slice(1)}`
  else return null

  if (e164.startsWith('+972')) {
    // Israeli mobile: 9 digits after the country code, starting with 5.
    return /^\+9725\d{8}$/.test(e164) ? e164 : null
  }
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null
}

export function formatPhone(e164: string): string {
  const local = /^\+9725(\d)(\d{3})(\d{4})$/.exec(e164)
  return local ? `05${local[1]}-${local[2]}-${local[3]}` : e164
}
