import type { BookingStatus } from '@/lib/types'

export const BOOKING_TONE: Record<BookingStatus, 'lagoon' | 'sun' | 'coral' | 'ocean' | 'muted'> = {
  awaiting_passports: 'lagoon',
  awaiting_payment: 'coral',
  paid: 'sun',
  voucher_ready: 'ocean',
  cancelled: 'muted',
}
