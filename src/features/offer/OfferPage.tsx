import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowRight, BadgePercent, Clock, LoaderCircle, SearchX, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState, GroupedList, ListRow, Page, SectionLabel } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { whatsappLink } from '@/lib/business'
import { formatDateRange, formatPrice, nightsBetween, pluralNights } from '@/lib/format'
import { partySummary } from '@/lib/labels'
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { formatDeadline, remaining, useNow } from '@/lib/time'
import { Gallery } from './Gallery'
import { OfferView } from './OfferView'
import type { OfferPayload, PublicOffer } from './types'

/** Where this offer stands for the person looking at it; everything on the page follows from it. */
type OfferState = 'mine' | 'booked' | 'expired' | 'taken' | 'open'

/** "Valid until tomorrow at 14:30"; only the last hour ticks, and then in minutes. */
function Deadline({ expiresAt, className }: { expiresAt: string | null; className?: string }) {
  const now = useNow()
  if (!expiresAt) return null
  const left = new Date(expiresAt).getTime() - now
  if (left <= 0) return null
  const urgent = left < 3_600_000
  return (
    <span className={clsx('inline-flex items-center gap-1.5', urgent ? 'font-semibold text-coral-700' : 'text-ink-soft', className)}>
      <Clock className="size-4 shrink-0" aria-hidden="true" />
      {urgent ? (
        <span role="timer">
          בתוקף עוד{' '}
          <span className="tabular" dir="ltr">
            {remaining(expiresAt, now)!.replace(/^00:/, '')}
          </span>
        </span>
      ) : (
        <span>בתוקף עד {formatDeadline(expiresAt, now)}</span>
      )}
    </span>
  )
}

function OfferSkeleton() {
  return (
    <div className="mx-auto max-w-6xl lg:px-8 lg:pt-6" role="status" aria-label="טוען את ההצעה">
      <div className="skeleton aspect-[4/3] rounded-none! md:aspect-[16/9] md:rounded-sheet!" />
      <div className="space-y-4 px-4 pt-6 lg:px-0">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-5 w-1/3" />
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
        <div className="skeleton h-40" />
      </div>
    </div>
  )
}

/** Phone top bar: a way back (customers often arrive straight from WhatsApp) and the hotel name. */
function OfferBar({ title }: { title: string }) {
  const navigate = useNavigate()
  // React Router keeps an index in history state; 0 means this page opened the app.
  const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
  return (
    <div className="sticky top-0 z-30 border-b border-lagoon-200 bg-white/90 backdrop-blur-xl md:hidden">
      <div className="grid h-13 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1 px-2">
        <button
          type="button"
          onClick={() => (canGoBack ? navigate(-1) : navigate('/offers'))}
          aria-label="חזרה"
          className="grid size-11 place-items-center rounded-full text-ocean-800 transition hover:bg-lagoon-100 active:scale-95"
        >
          <ArrowRight className="size-6" />
        </button>
        <p className="truncate text-center text-[17px] font-semibold text-ocean-950" dir="auto">
          {title}
        </p>
      </div>
    </div>
  )
}

const BOOKING_ERRORS: Record<string, string> = {
  PT410: 'ההצעה כבר לא בתוקף. כתבו לנו ונבדוק מחיר מעודכן.',
  PT409: 'מישהו כבר התחיל להזמין את ההצעה הזאת. אם זה אתם ממכשיר אחר, כתבו לנו.',
}

const STATUS_NOTE: Partial<Record<OfferState, { title: string; body: string; tone: string }>> = {
  mine: { title: 'שריינתם את המלון הזה', body: 'ההזמנה ממשיכה במסך ההזמנה: דרכונים, תשלום ווואוצ׳ר.', tone: 'bg-lagoon-100 text-ocean-900' },
  booked: { title: 'ההצעה הוזמנה', body: 'יש שאלה על ההזמנה? כתבו לנו בוואטסאפ.', tone: 'bg-lagoon-100 text-ocean-900' },
  taken: { title: 'ההצעה בתהליך הזמנה', body: 'אם התחלתם להזמין ממכשיר אחר, כתבו לנו ונמשיך משם.', tone: 'bg-sun-100 text-sun-ink' },
  expired: { title: 'ההצעה פגה', body: 'מחירי מלונות משתנים מהר. כתבו לנו, ונבדוק מחיר מעודכן לאותו מלון.', tone: 'bg-coral-500/10 text-coral-700' },
}

export function OfferPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const now = useNow()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ['offer', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_offer', { p_token: token })
      if (error) throw error
      return data as unknown as OfferPayload | null
    },
  })

  const book = useMutation({
    mutationFn: async (offerId: string) => {
      await ensureSession()
      const { data, error } = await supabase.rpc('start_booking', { p_offer_id: offerId })
      if (error) throw error
      return data
    },
    onSuccess: (bookingId) => navigate(`/bookings/${bookingId}`),
  })

  if (isPending) return <OfferSkeleton />
  if (isError || !data) {
    return (
      <Page className="pt-10">
        <EmptyState
          icon={SearchX}
          title="לא מצאנו את ההצעה"
          body="ייתכן שהקישור לא שלם או שההצעה הוחלפה. כתבו לנו ונשלח אותה שוב."
          action={{ href: whatsappLink(`היי, קישור להצעה לא נפתח לי:\n${window.location.href}`), label: 'כתבו לנו בוואטסאפ' }}
        />
      </Page>
    )
  }

  const options: PublicOffer[] = [data.offer, ...data.alternatives]
  const offer = options.find((o) => o.id === selectedId) ?? data.offer
  const isAlternative = offer.id !== data.offer.id
  const expired = !offer.expires_at || new Date(offer.expires_at).getTime() <= now
  const booked = options.some((o) => o.status === 'accepted')
  const state: OfferState = data.my_booking_id ? 'mine' : booked ? 'booked' : expired ? 'expired' : data.taken ? 'taken' : 'open'
  const note = STATUS_NOTE[state]

  const guests = partySummary(data.request.adults, data.request.children_ages)
  const dates = formatDateRange(offer.check_in, offer.check_out)
  const nights = nightsBetween(offer.check_in, offer.check_out)
  const link = window.location.href

  const questionMessage = `היי, יש לי שאלה על ההצעה ל${offer.hotel_name} (${dates})\n${link}`
  const priceMessage = `היי, קיבלתי הצעה ל${offer.hotel_name} (${dates}) ב־${formatPrice(offer.price_ils)}. המחיר לא מתאים לי, אפשר לבדוק אפשרויות נוספות?\n${link}`
  const shareText = `${offer.hotel_name}, ${offer.city}\n${dates}, ${formatPrice(offer.price_ils)} לכל השהייה\n${link}`

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: offer.hotel_name, text: shareText })
        return
      } catch {
        /* cancelled: fall through to WhatsApp */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noreferrer')
  }

  /** The single next step for this state. */
  const primary = (size: 'lg' | 'md', className?: string) => {
    if (state === 'mine')
      return (
        <Link to={`/bookings/${data.my_booking_id}`} className={buttonClass('primary', size, className)}>
          להזמנה שלי
        </Link>
      )
    if (state === 'booked' || state === 'taken')
      return (
        <a href={whatsappLink(questionMessage)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', size, className)}>
          <WhatsAppIcon /> כתבו לנו
        </a>
      )
    if (state === 'expired')
      return (
        <a href={whatsappLink(`היי, ההצעה ל${offer.hotel_name} (${dates}) פגה. אפשר לבדוק מחיר מעודכן?\n${link}`)} target="_blank" rel="noreferrer" className={buttonClass('primary', size, className)}>
          לבקש מחיר מעודכן
        </a>
      )
    return (
      <button type="button" onClick={() => book.mutate(offer.id)} disabled={book.isPending} className={buttonClass('primary', size, className)}>
        {book.isPending && <LoaderCircle className="size-5 animate-spin" />}
        שריון המלון
      </button>
    )
  }

  const bookError = book.error && (
    <p role="alert" className="mb-2 rounded-field bg-coral-500/10 px-3 py-2 text-[13px] text-coral-700">
      {BOOKING_ERRORS[(book.error as { code?: string }).code ?? ''] ?? 'לא הצלחנו להתחיל את ההזמנה. נסו שוב.'}
    </p>
  )

  return (
    <div className="pb-32 lg:pb-16">
      <OfferBar title={offer.hotel_name} />

      <div className="mx-auto max-w-6xl md:px-8 md:pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10 lg:pt-6">
        <div className="min-w-0">
          <Gallery key={offer.id} images={offer.images} alt={offer.hotel_name} />

          <div className="px-4 pt-5 md:px-0">
            {options.length > 1 && (
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-lift" role="tablist" aria-label="בחירת מלון">
                {options.map((o, i) => (
                  <button
                    key={o.id}
                    type="button"
                    role="tab"
                    aria-selected={o.id === offer.id}
                    onClick={() => setSelectedId(o.id)}
                    className={clsx('truncate rounded-full px-3 py-2.5 text-[15px] font-semibold transition', o.id === offer.id ? 'bg-ocean-800 text-white' : 'text-ocean-900 hover:bg-lagoon-50')}
                  >
                    {i === 0 ? 'ההצעה שלנו' : 'מלון חלופי'}
                    <span className="tabular ms-1.5 font-normal opacity-80">{formatPrice(o.price_ils)}</span>
                  </button>
                ))}
              </div>
            )}

            {note && (
              <div role="status" className={clsx('mb-5 rounded-sheet p-4', note.tone)}>
                <h2 className="text-[17px] font-semibold">{note.title}</h2>
                <p className="mt-0.5 text-[15px] text-ink">{note.body}</p>
              </div>
            )}

            <div key={offer.id} className="animate-rise">
              <OfferView
                offer={offer}
                guests={guests}
                intro={
                  isAlternative ? undefined : (
                    <p className="text-[17px] text-ink-soft">
                      {data.request.first_name ? `${data.request.first_name}, ` : ''}זה המלון שהצוות בחר לכם ל{data.request.destination}.
                    </p>
                  )
                }
              />
            </div>

            {state === 'open' && (
              <section className="mt-8">
                <SectionLabel>לפני שמזמינים</SectionLabel>
                <GroupedList>
                  <ListRow icon={WhatsAppIcon} tone="whatsapp" title="שאלה על ההצעה" detail="כותבים לצוות בוואטסאפ" href={whatsappLink(questionMessage)} />
                  <ListRow icon={BadgePercent} title="המחיר לא מתאים לי" detail="נבדוק אפשרויות נוספות" href={whatsappLink(priceMessage)} />
                  <ListRow icon={Share2} title="שיתוף עם מי שטס איתכם" onClick={() => void share()} />
                </GroupedList>
              </section>
            )}
          </div>
        </div>

        {/* Desktop: the decision stays in view while reading. */}
        <aside className="sticky top-6 hidden rounded-sheet bg-white p-6 shadow-lift lg:block" aria-label="הזמנה">
          <p className="text-[15px] text-ink-soft">
            {dates}, {pluralNights(nights)}
          </p>
          <p className="tabular mt-1 text-[2.5rem] leading-none font-bold text-ocean-950">{formatPrice(offer.price_ils)}</p>
          <p className="mt-1.5 text-[13px] text-ink-soft">
            לכל השהייה. בערך <span className="tabular">{formatPrice(Math.round(offer.price_ils / Math.max(1, nights)))}</span> ללילה
          </p>
          {state === 'open' && <Deadline expiresAt={offer.expires_at} className="mt-4 text-[15px]" />}
          <div className="mt-5">
            {bookError}
            {primary('lg', 'w-full')}
          </div>
        </aside>
      </div>

      {/* Phones and tablets: price and the one next step, within thumb reach. */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-lagoon-200 bg-white/95 px-4 pt-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto max-w-3xl">
          {bookError}
          {state === 'open' ? (
            <div className="flex items-center gap-4 pb-1">
              <div className="min-w-0 flex-1">
                <p className="tabular text-[22px] leading-tight font-bold text-ocean-950">{formatPrice(offer.price_ils)}</p>
                <Deadline expiresAt={offer.expires_at} className="text-[13px]" />
              </div>
              {primary('lg', 'shrink-0 px-7')}
            </div>
          ) : (
            <div className="pb-1">{primary('lg', 'w-full')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
