import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Clock, LoaderCircle, SearchX, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState, Page } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { whatsappLink } from '@/lib/business'
import { formatDateRange, formatPrice, nightsBetween, pluralNights } from '@/lib/format'
import { partySummary } from '@/lib/labels'
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { remaining, useNow } from '@/lib/time'
import { Gallery } from './Gallery'
import { OfferView, Stars } from './OfferView'
import type { OfferPayload, PublicOffer } from './types'

function Countdown({ expiresAt, className }: { expiresAt: string | null; className?: string }) {
  const now = useNow()
  const left = remaining(expiresAt, now)
  const urgent = !!expiresAt && new Date(expiresAt).getTime() - now < 3_600_000
  if (!left) return null
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold',
        urgent ? 'bg-coral-600 text-white' : 'bg-sun-300 text-ocean-950',
        className,
      )}
      role="timer"
      aria-label="זמן שנשאר להצעה"
    >
      <Clock className="size-4" />
      בתוקף עוד <span className="tabular" dir="ltr">{left}</span>
    </span>
  )
}

function OfferSkeleton() {
  return (
    <div className="mx-auto max-w-6xl lg:px-8 lg:pt-6" role="status" aria-label="טוען את ההצעה">
      <div className="skeleton aspect-[4/3] rounded-none! md:aspect-[16/9] md:rounded-sheet!" />
      <div className="space-y-4 px-4 pt-6 lg:px-0">
        <div className="skeleton h-9 w-2/3" />
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

const BOOKING_ERRORS: Record<string, string> = {
  PT410: 'ההצעה כבר לא בתוקף. כתבו לנו ונבדוק מחיר מעודכן.',
  PT409: 'מישהו כבר התחיל להזמין את ההצעה הזאת. אם זה אתם ממכשיר אחר, כתבו לנו.',
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
          body="ייתכן שהקישור לא שלם או שההצעה הוחלפה. כתבו לנו בוואטסאפ ונשלח אותה שוב."
          action={{ to: '/', label: 'לדף הבית' }}
        />
      </Page>
    )
  }

  const options: PublicOffer[] = [data.offer, ...data.alternatives]
  const offer = options.find((o) => o.id === selectedId) ?? data.offer
  const isAlternative = offer.id !== data.offer.id
  const expired = !offer.expires_at || new Date(offer.expires_at).getTime() <= now
  const booked = data.offer.status === 'accepted' || options.some((o) => o.status === 'accepted')
  const guests = partySummary(data.request.adults, data.request.children_ages)
  const dates = formatDateRange(offer.check_in, offer.check_out)
  const nights = nightsBetween(offer.check_in, offer.check_out)
  const link = window.location.href

  const priceMessage = `היי, קיבלתי הצעה ל${offer.hotel_name} (${dates}) ב־${formatPrice(offer.price_ils)}. המחיר לא מתאים לי, אפשר לבדוק אפשרויות נוספות?\n${link}`
  const shareText = `תראו מה מצאתי 🌴\n${offer.hotel_name}, ${offer.city}\n${dates}, ${formatPrice(offer.price_ils)} לכל השהייה\n${link}`

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

  const intro = (
    <p className="text-lg text-ink-soft">
      {data.request.first_name ? `${data.request.first_name}, ` : ''}זה המלון שהצוות בחר לכם ל{data.request.destination}.
    </p>
  )

  /** The one decision on this page, rendered as a dock on phones and a sticky panel on desktop. */
  const actions = (variant: 'dock' | 'panel') => {
    const secondary =
      variant === 'dock'
        ? 'flex flex-col items-center gap-0.5 rounded-field py-1.5 text-sm font-medium text-ocean-800 transition hover:bg-lagoon-100'
        : 'flex items-center gap-2 rounded-field px-2 py-2 text-[0.95rem] font-medium text-ocean-800 transition hover:bg-lagoon-100'
    return (
      <>
        {book.error && (
          <p role="alert" className="mb-2 rounded-field bg-coral-500/10 px-3 py-2 text-sm text-coral-700">
            {BOOKING_ERRORS[(book.error as { code?: string }).code ?? ''] ?? 'לא הצלחנו להתחיל את ההזמנה. נסו שוב.'}
          </p>
        )}
        {data.my_booking_id ? (
          <Link to={`/bookings/${data.my_booking_id}`} className={buttonClass('primary', 'lg', 'w-full')}>
            להמשך ההזמנה
          </Link>
        ) : booked || data.taken ? (
          <a href={whatsappLink(`היי, לגבי ההצעה ל${offer.hotel_name}\n${link}`)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'lg', 'w-full')}>
            <WhatsAppIcon /> שאלה על ההזמנה
          </a>
        ) : expired ? (
          <a
            href={whatsappLink(`היי, ההצעה ל${offer.hotel_name} (${dates}) פגה. אפשר לבדוק מחיר מעודכן?\n${link}`)}
            target="_blank"
            rel="noreferrer"
            className={buttonClass('primary', 'lg', 'w-full')}
          >
            לבקש מחיר מעודכן
          </a>
        ) : (
          <button type="button" onClick={() => book.mutate(offer.id)} disabled={book.isPending} className={buttonClass('primary', 'lg', 'w-full')}>
            {book.isPending && <LoaderCircle className="size-5 animate-spin" />}
            שריין ושלם עכשיו
            {variant === 'dock' && <span className="tabular font-normal opacity-90">{formatPrice(offer.price_ils)}</span>}
          </button>
        )}
        <div className={clsx('grid gap-2', variant === 'dock' ? 'mt-1.5 grid-cols-2 pb-1' : 'mt-3')}>
          <a href={whatsappLink(priceMessage)} target="_blank" rel="noreferrer" className={secondary}>
            <WhatsAppIcon className="size-5 text-whatsapp-mark" />
            המחיר לא מתאים לי
          </a>
          <button type="button" onClick={() => void share()} className={secondary}>
            <Share2 className="size-5" />
            לשתף את מי שטס איתכם
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="pb-48 lg:pb-16">
      <div className="mx-auto max-w-6xl md:px-8 md:pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10 lg:pt-6">
        <div className="min-w-0">
          <div className="relative">
            <Gallery key={offer.id} images={offer.images} alt={offer.hotel_name} />
            {!booked && <Countdown expiresAt={offer.expires_at} className="absolute top-3 end-3 shadow-lift lg:hidden" />}
          </div>

          <div className="relative z-10 -mt-6 rounded-t-dock bg-lagoon-50 px-4 pt-6 md:mt-0 md:px-0">
            {options.length > 1 && (
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-lift" role="tablist" aria-label="בחירת מלון">
                {options.map((o, i) => (
                  <button
                    key={o.id}
                    type="button"
                    role="tab"
                    aria-selected={o.id === offer.id}
                    onClick={() => setSelectedId(o.id)}
                    className={clsx(
                      'truncate rounded-full px-3 py-2.5 text-[0.95rem] font-semibold transition',
                      o.id === offer.id ? 'bg-ocean-800 text-white' : 'text-ocean-900 hover:bg-lagoon-50',
                    )}
                  >
                    {i === 0 ? 'ההצעה שלנו' : 'מלון חלופי'}
                    <span className="tabular ms-1.5 font-normal opacity-80">{formatPrice(o.price_ils)}</span>
                  </button>
                ))}
              </div>
            )}

            {expired && !booked && (
              <div role="status" className="mb-6 rounded-sheet bg-coral-500/10 p-5">
                <h2 className="text-lg font-bold text-coral-700">ההצעה פגה</h2>
                <p className="mt-1 text-ink">מחירי מלונות משתנים מהר. כתבו לנו, ונבדוק מחיר מעודכן לאותו מלון.</p>
              </div>
            )}
            {booked && (
              <div role="status" className="mb-6 rounded-sheet bg-lagoon-100 p-5">
                <h2 className="text-lg font-bold text-ocean-800">ההצעה הוזמנה</h2>
                <p className="mt-1">ההזמנה והוואוצ׳ר נמצאים בלשונית ההזמנות שלי.</p>
              </div>
            )}

            <div key={offer.id} className="animate-rise">
              <OfferView offer={offer} guests={guests} intro={isAlternative ? undefined : intro} />
            </div>

            {!isAlternative && data.alternatives[0] && (
              <button
                type="button"
                onClick={() => {
                  setSelectedId(data.alternatives[0]!.id)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="mt-6 flex w-full items-center gap-4 rounded-sheet bg-white p-4 text-start shadow-lift transition hover:-translate-y-px hover:shadow-glass"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{data.alternatives[0].hotel_name}</span>
                    <Stars count={data.alternatives[0].stars} />
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-soft">אפשר גם את המלון החלופי. לחצו להשוואה.</span>
                </span>
                <span className="tabular text-lg font-bold text-ocean-900">{formatPrice(data.alternatives[0].price_ils)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop: the decision stays in view while reading. */}
        <aside className="sticky top-6 hidden rounded-sheet bg-white p-6 shadow-lift lg:block" aria-label="הזמנה">
          {!booked && <Countdown expiresAt={offer.expires_at} className="mb-5" />}
          <p className="text-ink-soft">
            {dates}, {pluralNights(nights)}
          </p>
          <p className="tabular mt-1 text-[2.5rem] leading-none font-extrabold text-ocean-900">{formatPrice(offer.price_ils)}</p>
          <p className="mt-1.5 text-sm text-ink-soft">
            לכל השהייה. בערך <span className="tabular">{formatPrice(Math.round(offer.price_ils / nights))}</span> ללילה
          </p>
          <div className="mt-6">{actions('panel')}</div>
        </aside>
      </div>

      {/* Phones and tablets: a dock within thumb reach. */}
      <div className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 rounded-t-dock px-4 pt-3 lg:hidden">
        <div className="mx-auto max-w-3xl">{actions('dock')}</div>
      </div>
    </div>
  )
}
