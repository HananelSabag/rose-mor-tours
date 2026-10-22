import type { BoardBasis, BookingStatus, RequestStatus, RoomSetup, VacationStyle } from './types'

export const BOARD_BASIS: Record<BoardBasis, { label: string; hint: string }> = {
  RO: { label: 'לינה בלבד', hint: 'בלי ארוחות' },
  BB: { label: 'ארוחת בוקר', hint: 'לינה וארוחת בוקר' },
  HB: { label: 'חצי פנסיון', hint: 'בוקר וערב' },
  FB: { label: 'פנסיון מלא', hint: 'שלוש ארוחות' },
  AI: { label: 'הכל כלול', hint: 'ארוחות ושתייה' },
}

export const ROOM_SETUP: Record<RoomSetup, { label: string; hint: string }> = {
  one_room: { label: 'חדר אחד', hint: 'כולם יחד' },
  connecting: { label: 'חדרים מקושרים', hint: 'שני חדרים עם דלת ביניהם' },
  suite: { label: 'סוויטה', hint: 'חדר שינה וסלון' },
}

export const VACATION_STYLE: Record<VacationStyle, string> = {
  resort: 'ריזורט',
  city: 'חופשה בעיר',
  adults_only: 'למבוגרים בלבד',
  family: 'משפחתי',
}

export const REQUEST_STATUS: Record<RequestStatus, string> = {
  new: 'התקבלה',
  in_progress: 'מחפשים לכם מלון',
  offered: 'ההצעה נשלחה',
  closed: 'נסגרה',
  cancelled: 'בוטלה',
}

export const BOOKING_STATUS: Record<BookingStatus, string> = {
  awaiting_passports: 'מחכה לדרכונים',
  awaiting_payment: 'מחכה לתשלום',
  paid: 'הוואוצ׳ר בהפקה',
  voucher_ready: 'מוכן',
  cancelled: 'בוטלה',
}

export function childAgeLabel(age: number): string {
  if (age === 0) return 'פחות משנה'
  if (age === 1) return 'שנה'
  return `${age}`
}

export function partySummary(adults: number, childrenAges: number[]): string {
  const a = adults === 1 ? 'מבוגר אחד' : adults === 2 ? 'שני מבוגרים' : `${adults} מבוגרים`
  if (childrenAges.length === 0) return a
  const ages = childrenAges.map((age) => (age === 0 ? 'תינוק' : `${age}`)).join(', ')
  const c = childrenAges.length === 1 ? `ילד (${ages})` : `${childrenAges.length} ילדים (${ages})`
  // "ו" attaches directly to a word, but takes a maqaf before a digit ("ו־2 ילדים").
  return `${a} ו${/^\d/.test(c) ? '־' : ''}${c}`
}

export function starsLabel(minStars: number | null): string {
  if (!minStars) return 'לא משנה'
  return minStars === 5 ? '5 כוכבים' : `${minStars} כוכבים ומעלה`
}
