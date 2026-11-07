import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, FileText, PartyPopper, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { AppBar } from '@/components/AppBar'
import { Card, EmptyState, Loading, Page } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { Stars } from '@/features/offer/OfferView'
import { whatsappLink } from '@/lib/business'
import { formatDate, formatDateRange, formatPrice, nightsBetween, pluralNights } from '@/lib/format'
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
  const accent = { sun: 'border-sun-400', lagoon: 'border-turquoise-500', coral: 'border-coral-600' }
  return (
    <section className={clsx('rounded-sheet border-s-4 bg-white p-5 shadow-lift', accent[tone])}>
      <h2 className="text-[19px] font-semibold text-ocean-950">{title}</h2>
      <div className="mt-2 space-y-4 text-[15px] text-ink">{children}</div>
    </section>
  )
}

export function BookingPage() {
  const { id } = useParams()
  const { data: booking, isPending, sessionReady, signedIn } = useBooking(id)
  const openVoucher = useMutation({
    mutationFn: (download: boolean) => openSignedFile('vouchers', booking!.voucher_path!, download ? 'voucher' : undefined),
  })

  if (!sessionReady || (signedIn && isPending)) {
    return (
      <>
        <AppBar title="ההזמנה" back="/bookings" />
        <Loading />
      </>
    )
  }
  if (!booking || !booking.offer) {
    return (
      <>
        <AppBar title="ההזמנה" back="/bookings" />
        <Page>
          <EmptyState
            icon={SearchX}
            title="לא מצאנו את ההזמנה"
            body="אולי היא נפתחה ממכשיר אחר. כתבו לנו ונעזור."
            action={{ href: whatsappLink('היי, אני לא מוצא את ההזמנה שלי באפליקציה'), label: 'כתבו לנו בוואטסאפ' }}
          />
        </Page>
      </>
    )
  }

  const offer = booking.offer
  const dates = formatDateRange(offer.check_in, offer.check_out)
  const cover = offer.images[0]

  return (
    <>
      <AppBar title={offer.hotel_name} subtitle={`${offer.city}, ${offer.country}`} back="/bookings" />
      <Page className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <Card className="mb-6 flex gap-3.5 p-3! lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:mb-0">
          {cover && <img src={hotelImageUrl(cover)} alt="" className="size-21 shrink-0 rounded-field bg-lagoon-100 object-cover" />}
          <div className="flex min-w-0 flex-1 flex-col py-0.5">
            <Stars count={offer.stars} />
            <p className="mt-1 text-[15px] text-ink">
              {dates}, {pluralNights(nightsBetween(offer.check_in, offer.check_out))}
            </p>
            <p className="truncate text-[13px] text-ink-soft">
              {offer.room_type}, {BOARD_BASIS[offer.board_basis].label}
            </p>
            <p className="tabular mt-auto pt-1 text-[17px] font-semibold text-ocean-900">{formatPrice(booking.amount_ils)}</p>
            <p className="text-[13px] text-ink-soft">{booking.free_cancellation_until ? `ביטול חינם עד ${formatDate(booking.free_cancellation_until)}` : 'אין ביטול חינם'}</p>
          </div>
        </Card>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
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
            <StatusCard tone="sun" title="הוואוצ׳ר מוכן">
              <p>מציגים אותו בקבלה במלון, מהטלפון או מודפס. חופשה נעימה!</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => openVoucher.mutate(false)} className={buttonClass('primary', 'md')}>
                  <FileText className="size-5" /> פתיחת הוואוצ׳ר
                </button>
                {booking.receipt_url && (
                  <a href={booking.receipt_url} target="_blank" rel="noreferrer" className={buttonClass('ghost', 'md')}>
                    <FileText className="size-5" /> קבלה
                  </a>
                )}
              </div>
              {openVoucher.isError && (
                <p role="alert" className="text-sm text-coral-700">
                  לא הצלחנו לפתוח את הקובץ. נסו שוב.
                </p>
              )}
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
            <p className="mt-6 flex items-center justify-center gap-2 text-[15px] text-ink-soft">
              <PartyPopper className="size-5 text-coral-600" /> תודה שבחרתם ב־Rose&amp;Mor
            </p>
          )}
        </div>
      </Page>
    </>
  )
}
