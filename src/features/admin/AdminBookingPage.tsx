import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CircleCheck, CircleDashed, ExternalLink, FileUp, LoaderCircle, Phone, Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Card, Loading, Pill } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { BOOKING_SELECT, openSignedFile, travelerLabels, type BookingDetails } from '@/features/bookings/queries'
import { formatDateRange, formatPhone, formatPrice, nightsBetween, pluralNights } from '@/lib/format'
import { BOARD_BASIS, BOOKING_STATUS } from '@/lib/labels'
import { fileExtension } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { BOOKING_TONE } from './tones'
import { customerWhatsapp, firstName } from './whatsapp'

type AdminBooking = BookingDetails & {
  customer_id: string
  offer: (NonNullable<BookingDetails['offer']> & { request: { id: string; contact_name: string; contact_phone: string } | null }) | null
}

const field = 'h-11 w-full rounded-field bg-white px-3 ring-1 ring-lagoon-200 outline-none focus:ring-2 focus:ring-ocean-700'

function TravelerRow({ traveler, label, purged, onSaved }: { traveler: AdminBooking['travelers'][number]; label: string; purged: boolean; onSaved: () => void }) {
  const [name, setName] = useState(traveler.full_name_en ?? '')
  const saveName = useMutation({
    mutationFn: async () => {
      const value = name.trim().toUpperCase() || null
      const { error } = await supabase.from('travelers').update({ full_name_en: value }).eq('id', traveler.id)
      if (error) throw error
    },
    onSuccess: onSaved,
  })
  const open = useMutation({ mutationFn: () => openSignedFile('passports', traveler.passport_path!) })
  const dirty = (name.trim().toUpperCase() || null) !== (traveler.full_name_en ?? null)
  const invalid = name.trim() !== '' && !/^[A-Za-z][A-Za-z' -]{1,79}$/.test(name.trim())

  return (
    <li className="space-y-3 py-4">
      <div className="flex items-center gap-3">
        {traveler.passport_path ? <CircleCheck className="size-6 shrink-0 text-turquoise-500" /> : <CircleDashed className="size-6 shrink-0 text-ink-faint" />}
        <span className="flex-1 font-semibold">{label}</span>
        {traveler.passport_path ? (
          <button type="button" onClick={() => open.mutate()} className={buttonClass('secondary', 'md', 'h-10')}>
            <ExternalLink className="size-4" /> דרכון
          </button>
        ) : (
          <span className="text-sm text-ink-faint">{purged ? 'נמחק לפי מדיניות הפרטיות' : 'עוד לא הועלה'}</span>
        )}
      </div>
      <form
        className="flex gap-2 ps-9"
        onSubmit={(e) => {
          e.preventDefault()
          if (dirty && !invalid) saveName.mutate()
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם באנגלית כמו בדרכון"
          dir="ltr"
          aria-invalid={invalid}
          className={`${field} uppercase aria-invalid:ring-coral-600`}
        />
        <button type="submit" disabled={!dirty || invalid || saveName.isPending} className={buttonClass('secondary', 'md', 'h-11 shrink-0')}>
          שמירה
        </button>
      </form>
      {open.isError && <p className="ps-9 text-sm text-coral-700">לא הצלחנו לפתוח את הקובץ.</p>}
    </li>
  )
}

export function AdminBookingPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin'] })
  const { data: booking, isPending } = useQuery({
    queryKey: ['admin', 'booking', id],
    queryFn: async () => {
      const select = BOOKING_SELECT.replace('public_token)', 'public_token, request:quote_requests(id, contact_name, contact_phone))') + ', customer_id'
      const { data, error } = await supabase.from('bookings').select(select).eq('id', id!).order('created_at', { referencedTable: 'travelers', ascending: true }).maybeSingle()
      if (error) throw error
      return data as unknown as AdminBooking | null
    },
  })

  const [installments, setInstallments] = useState(1)
  const [receiptUrl, setReceiptUrl] = useState('')

  const update = useMutation({
    mutationFn: async (patch: { status?: 'paid' | 'cancelled'; installments?: number; receipt_url?: string | null }) => {
      const { error } = await supabase.from('bookings').update(patch).eq('id', id!)
      if (error) throw error
    },
    onSettled: invalidate,
  })

  const uploadVoucher = useMutation({
    mutationFn: async (file: File) => {
      const path = `${id}/voucher-${Date.now()}.${fileExtension(file, 'pdf')}`
      const { error } = await supabase.storage.from('vouchers').upload(path, file, { contentType: file.type })
      if (error) throw error
      const { error: rowError } = await supabase.from('bookings').update({ voucher_path: path }).eq('id', id!)
      if (rowError) throw rowError
    },
    onSettled: invalidate,
  })

  const openVoucher = useMutation({ mutationFn: () => openSignedFile('vouchers', booking!.voucher_path!) })

  if (isPending) return <Loading />
  if (!booking?.offer) return <p className="py-10 text-center text-ink-soft">ההזמנה לא נמצאה.</p>

  const offer = booking.offer
  const request = offer.request
  const phone = booking.contact_phone ?? request?.contact_phone ?? ''
  const name = request ? firstName(request.contact_name) : ''
  const dates = formatDateRange(offer.check_in, offer.check_out)
  const labels = travelerLabels(booking.travelers)
  const bookingLink = `${window.location.origin}/bookings/${booking.id}`

  const messages = {
    passports: `היי ${name}, כדי לשריין את ${offer.hotel_name} חסרים רק צילומי הדרכונים. אפשר להעלות כאן: ${bookingLink}`,
    payment: `היי ${name}, קיבלנו את הדרכונים 🙏\nהנה הקישור לתשלום על ${offer.hotel_name} (${dates}, ${formatPrice(booking.amount_ils)}):\n`,
    voucher: `היי ${name}, הוואוצ׳ר ל${offer.hotel_name} מוכן 🎉\nאפשר לצפות ולהוריד אותו כאן: ${bookingLink}\nחופשה מהנה!`,
  }

  return (
    <div>
      <Link to="/admin/bookings" className="mb-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-ocean-700 hover:underline lg:hidden">
        <ArrowRight className="size-4" /> לכל ההזמנות
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] leading-tight font-bold text-ocean-950">{request?.contact_name ?? 'הזמנה'}</h1>
            <Pill tone={BOOKING_TONE[booking.status]}>{BOOKING_STATUS[booking.status]}</Pill>
          </div>
          <p className="mt-1 text-ink-soft">
            {offer.hotel_name}, {offer.city}. {dates} ({pluralNights(nightsBetween(offer.check_in, offer.check_out))}), {offer.room_type}, {BOARD_BASIS[offer.board_basis].label}
          </p>
          <p className="tabular mt-1 text-xl font-bold text-ocean-900">{formatPrice(booking.amount_ils)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {phone && (
            <>
              <a href={customerWhatsapp(phone)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
                <WhatsAppIcon /> וואטסאפ
              </a>
              <a href={`tel:${phone}`} className={buttonClass('secondary', 'md')}>
                <Phone className="size-4" /> <span dir="ltr">{formatPhone(phone)}</span>
              </a>
            </>
          )}
          {request && (
            <Link to={`/admin/requests/${request.id}`} className={buttonClass('ghost', 'md')}>
              לבקשה
            </Link>
          )}
        </div>
      </div>

      <div className="grid items-start gap-5 2xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">נוסעים</h2>
          <p className="text-sm text-ink-soft">מוסיפים שם באנגלית מהדרכון, בשביל ההזמנה מול הספק.</p>
          <ul className="divide-y divide-lagoon-200">
            {booking.travelers.map((t, i) => (
              <TravelerRow
                key={t.id}
                traveler={t}
                label={labels[i]!}
                // After payment a missing scan can only mean the nightly cleanup removed it.
                purged={booking.status === 'paid' || booking.status === 'voucher_ready' || booking.status === 'cancelled'}
                onSaved={invalidate}
              />
            ))}
          </ul>
          <dl className="mt-2 space-y-1 border-t border-lagoon-200 pt-4 text-sm">
            <div className="flex gap-2">
              <dt className="text-ink-soft">מייל:</dt>
              <dd dir="ltr">{booking.contact_email ?? 'עוד לא מולא'}</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-5">
          {booking.status === 'awaiting_passports' && (
            <Card>
              <h2 className="text-lg font-semibold">הלקוח עוד מעלה דרכונים</h2>
              <p className="mt-1 mb-4 text-ink-soft">אפשר להזכיר לו בהודעה עם קישור ישיר להזמנה.</p>
              <a href={customerWhatsapp(phone, messages.passports)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
                <Send className="size-4" /> תזכורת בוואטסאפ
              </a>
            </Card>
          )}

          {(booking.status === 'awaiting_payment' || booking.status === 'awaiting_passports') && (
            <Card>
              <h2 className="text-lg font-semibold">תשלום</h2>
              <ol className="mt-2 mb-4 list-inside list-decimal space-y-1 text-ink-soft">
                <li>יוצרים קישור תשלום ב־grow על {formatPrice(booking.amount_ils)}.</li>
                <li>שולחים אותו ללקוח. ההודעה נפתחת מוכנה, רק מדביקים את הקישור.</li>
                <li>כשהתשלום עובר, מסמנים כאן ״שולם״.</li>
              </ol>
              <a href={customerWhatsapp(phone, messages.payment)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
                <Send className="size-4" /> שליחת קישור תשלום
              </a>
              <form
                className="mt-5 grid grid-cols-2 gap-3 border-t border-lagoon-200 pt-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (window.confirm(`לסמן ש־${formatPrice(booking.amount_ils)} שולמו?`)) {
                    update.mutate({ status: 'paid', installments, receipt_url: receiptUrl.trim() || null })
                  }
                }}
              >
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink-soft">תשלומים</span>
                  <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className={field}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? 'תשלום אחד' : `${n} תשלומים`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink-soft">קישור לקבלה (לא חובה)</span>
                  <input type="url" dir="ltr" value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} className={field} />
                </label>
                <button type="submit" disabled={update.isPending} className={buttonClass('primary', 'md', 'col-span-2')}>
                  {update.isPending && <LoaderCircle className="size-4 animate-spin" />}
                  סימון כשולם
                </button>
              </form>
            </Card>
          )}

          {(booking.status === 'paid' || booking.status === 'voucher_ready') && (
            <Card>
              <h2 className="text-lg font-semibold">וואוצ׳ר</h2>
              {booking.status === 'paid' && <p className="mt-1 mb-4 text-ink-soft">אחרי ההזמנה מול הספק מעלים את הוואוצ׳ר. הסטטוס של הלקוח יתחלף ל״מוכן 🎉״.</p>}
              {booking.voucher_path && (
                <div className="mt-2 mb-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openVoucher.mutate()} className={buttonClass('secondary', 'md')}>
                    <ExternalLink className="size-4" /> צפייה בוואוצ׳ר
                  </button>
                  <a href={customerWhatsapp(phone, messages.voucher)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
                    <Send className="size-4" /> שליחה ללקוח
                  </a>
                </div>
              )}
              <label className={buttonClass(booking.voucher_path ? 'ghost' : 'primary', 'md', 'cursor-pointer')}>
                {uploadVoucher.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                {booking.voucher_path ? 'החלפת הוואוצ׳ר' : 'העלאת וואוצ׳ר'}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadVoucher.mutate(file)
                    e.target.value = ''
                  }}
                />
              </label>
              {uploadVoucher.isError && <p className="mt-2 text-sm text-coral-700">ההעלאה נכשלה. עד 20MB, PDF או תמונה.</p>}
              {booking.receipt_url && (
                <a href={booking.receipt_url} target="_blank" rel="noreferrer" className="mt-4 block text-sm text-ocean-700 underline">
                  קבלה
                </a>
              )}
            </Card>
          )}

          {booking.status !== 'cancelled' && booking.status !== 'voucher_ready' && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('לבטל את ההזמנה?')) update.mutate({ status: 'cancelled' })
              }}
              className={buttonClass('ghost', 'md', 'text-coral-700 hover:bg-coral-500/10')}
            >
              <XCircle className="size-4" /> ביטול ההזמנה
            </button>
          )}
          {update.isError && <p role="alert" className="text-sm text-coral-700">הפעולה נכשלה. נסו שוב.</p>}
        </div>
      </div>
    </div>
  )
}
