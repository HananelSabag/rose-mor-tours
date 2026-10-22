import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, Download, Eye, FileText, PartyPopper, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { Card, EmptyState, Loading, Page } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { Stars } from '@/features/offer/OfferView'
import { whatsappLink } from '@/lib/business'
import { formatDateRange, formatPrice, nightsBetween, pluralNights } from '@/lib/format'
import { BOARD_BASIS } from '@/lib/labels'
import { hotelImageUrl } from '@/lib/storage'
import { PassportsForm } from './PassportsForm'
import { openSignedFile, useBooking, type BookingDetails } from './queries'

const STEPS = ['דרכונים', 'תשלום', 'וואוצ׳ר'] as const

function stepOf(status: BookingDetails['status']): number {
  if (status === 'awaiting_passports') return 0
  if (status === 'awaiting_payment') return 1
  if (status === 'paid') return 2
  return 3
}

function Steps({ status }: { status: BookingDetails['status'] }) {
  const current = stepOf(status)
  return (
    <ol className="flex items-center gap-2" aria-label="שלבי ההזמנה">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2">
          <span
            className={clsx(
              'grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold',
              i < current ? 'bg-turquoise-500 text-white' : i === current ? 'bg-sun-300 text-ocean-950' : 'bg-white text-ink-faint ring-1 ring-lagoon-200',
            )}
            aria-current={i === current ? 'step' : undefined}
          >
            {i < current ? <Check className="size-4" strokeWidth={3} /> : i + 1}
          </span>
          <span className={clsx('text-sm font-medium', i > current && 'text-ink-faint')}>{label}</span>
          {i < STEPS.length - 1 && <span className={clsx('h-0.5 flex-1 rounded-full', i < current ? 'bg-turquoise-500' : 'bg-lagoon-200')} />}
        </li>
      ))}
    </ol>
  )
}

function StatusCard({ tone, title, children }: { tone: 'sun' | 'lagoon' | 'coral'; title: string; children: ReactNode }) {
  const tones = { sun: 'from-sun-100 to-white ring-sun-300/60', lagoon: 'from-lagoon-100 to-white ring-lagoon-200', coral: 'from-coral-500/10 to-white ring-coral-500/30' }
  return (
    <section className={clsx('rounded-sheet bg-linear-to-b p-6 ring-1', tones[tone])}>
      <h2 className="text-xl font-bold text-ocean-950">{title}</h2>
      <div className="mt-2 space-y-4 text-ink">{children}</div>
    </section>
  )
}

export function BookingPage() {
  const { id } = useParams()
  const { data: booking, isPending, sessionReady, signedIn } = useBooking(id)
  const openVoucher = useMutation({
    mutationFn: (download: boolean) => openSignedFile('vouchers', booking!.voucher_path!, download ? 'voucher' : undefined),
  })

  if (!sessionReady || (signedIn && isPending)) return <Loading />
  if (!booking || !booking.offer) {
    return (
      <Page className="pt-6">
        <EmptyState icon={SearchX} title="לא מצאנו את ההזמנה" body="אולי היא נפתחה ממכשיר אחר. כתבו לנו בוואטסאפ ונעזור." action={{ to: '/bookings', label: 'להזמנות שלי' }} />
      </Page>
    )
  }

  const offer = booking.offer
  const dates = formatDateRange(offer.check_in, offer.check_out)
  const cover = offer.images[0]

  return (
    <Page>
      <Card className="mb-6 flex gap-4 p-4!">
        {cover && <img src={hotelImageUrl(cover)} alt="" className="size-20 shrink-0 rounded-field object-cover" />}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-ocean-950">{offer.hotel_name}</h1>
            <Stars count={offer.stars} />
          </div>
          <p className="text-ink-soft">
            {offer.city}. {dates}, {pluralNights(nightsBetween(offer.check_in, offer.check_out))}
          </p>
          <p className="text-sm text-ink-soft">
            {offer.room_type}, {BOARD_BASIS[offer.board_basis].label}
          </p>
          <p className="tabular mt-1 font-bold text-ocean-900">{formatPrice(booking.amount_ils)}</p>
        </div>
      </Card>

      {booking.status !== 'cancelled' && (
        <div className="mb-8">
          <Steps status={booking.status} />
        </div>
      )}

      {booking.status === 'awaiting_passports' && <PassportsForm booking={booking} />}

      {booking.status === 'awaiting_payment' && (
        <StatusCard tone="sun" title="הדרכונים התקבלו. נשאר רק לשלם">
          <p>הצוות שולח לכם עכשיו קישור לתשלום מאובטח בוואטסאפ. אפשר לשלם באשראי, גם בתשלומים.</p>
          <p className="text-ink-soft">מזמינים את המלון מול הספק מיד אחרי התשלום.</p>
          <a href={whatsappLink(`היי, העליתי דרכונים להזמנה ב${offer.hotel_name} (${dates}). אשמח לקישור לתשלום`)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
            <WhatsAppIcon /> לא קיבלתי קישור
          </a>
        </StatusCard>
      )}

      {booking.status === 'paid' && (
        <StatusCard tone="lagoon" title="התשלום התקבל. הוואוצ׳ר בהפקה">
          <p>אנחנו סוגרים את ההזמנה מול המלון. כשהוואוצ׳ר יהיה מוכן, הוא יופיע כאן ונשלח לכם הודעה בוואטסאפ.</p>
          {booking.receipt_url && (
            <a href={booking.receipt_url} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'md')}>
              <FileText className="size-5" /> לקבלה
            </a>
          )}
        </StatusCard>
      )}

      {booking.status === 'voucher_ready' && (
        <StatusCard tone="sun" title="הוואוצ׳ר מוכן 🎉">
          <p>מציגים אותו בקבלה במלון, מהטלפון או מודפס. חופשה נעימה!</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => openVoucher.mutate(false)} className={buttonClass('primary', 'md')}>
              <Eye className="size-5" /> צפייה בוואוצ׳ר
            </button>
            <button type="button" onClick={() => openVoucher.mutate(true)} className={buttonClass('secondary', 'md')}>
              <Download className="size-5" /> הורדה
            </button>
            {booking.receipt_url && (
              <a href={booking.receipt_url} target="_blank" rel="noreferrer" className={buttonClass('ghost', 'md')}>
                <FileText className="size-5" /> קבלה
              </a>
            )}
          </div>
          {openVoucher.isError && <p role="alert" className="text-sm text-coral-600">לא הצלחנו לפתוח את הקובץ. נסו שוב.</p>}
          <a href={whatsappLink(`היי, אני בחופשה ב${offer.hotel_name} וצריך עזרה`)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
            <WhatsAppIcon /> עזרה בחו״ל
          </a>
        </StatusCard>
      )}

      {booking.status === 'cancelled' && (
        <StatusCard tone="coral" title="ההזמנה בוטלה">
          <p>אם זו טעות, או שתרצו הצעה חדשה, כתבו לנו.</p>
          <a href={whatsappLink(`היי, לגבי ההזמנה ב${offer.hotel_name} (${dates})`)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
            <WhatsAppIcon /> כתבו לנו
          </a>
        </StatusCard>
      )}

      {booking.status === 'voucher_ready' && (
        <p className="mt-6 flex items-center justify-center gap-2 text-ink-soft">
          <PartyPopper className="size-5 text-coral-500" /> תודה שבחרתם ב־Rose&amp;Mor
        </p>
      )}
    </Page>
  )
}
