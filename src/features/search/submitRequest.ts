import { normalizePhone } from '@/lib/format'
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import type { QuoteRequestInsert } from '@/lib/types'
import type { Draft } from './draft'

export class SubmitError extends Error {}

export async function submitRequest(draft: Draft): Promise<string> {
  const phone = normalizePhone(draft.contactPhone)
  if (!draft.checkIn || !draft.checkOut || !phone) throw new SubmitError('חסרים פרטים בשאלון')

  let userId: string
  try {
    userId = (await ensureSession()).user.id
  } catch {
    throw new SubmitError('לא הצלחנו להתחבר לשרת. בדקו את החיבור לאינטרנט ונסו שוב.')
  }

  const payload: QuoteRequestInsert = {
    customer_id: userId,
    destination: draft.destination.trim(),
    hotel_name: draft.hotelMode === 'specific' ? draft.hotelName.trim() : null,
    check_in: draft.checkIn,
    check_out: draft.checkOut,
    flexible_days: draft.flexibleDays,
    adults: draft.adults,
    children_ages: draft.childrenAges.filter((age): age is number => age !== null),
    room_setup: draft.roomSetup,
    min_stars: draft.minStars,
    board_basis: draft.boardBasis,
    vacation_styles: draft.vacationStyles,
    notes: draft.notes.trim() || null,
    contact_name: draft.contactName.trim(),
    contact_phone: phone,
  }

  const { data, error } = await supabase.from('quote_requests').insert(payload).select('id').single()
  if (error) {
    if (error.code === 'PT429') throw new SubmitError('שלחתם כבר כמה בקשות היום. אפשר לכתוב לנו בוואטסאפ ונמשיך משם.')
    if (error.code === '22023') throw new SubmitError('תאריך ההגעה כבר עבר. בחרו תאריכים חדשים.')
    throw new SubmitError('לא הצלחנו לשלוח את הבקשה. בדקו את החיבור לאינטרנט ונסו שוב.')
  }

  // Keep the profile in sync so staff see a name even before checkout. Best effort.
  void supabase
    .from('profiles')
    .update({ full_name: payload.contact_name, phone })
    .eq('id', userId)
    .then(() => undefined)

  return data.id
}
