import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Clock, LoaderCircle, SearchX, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState, Loading, Page } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { whatsappLink } from '@/lib/business'
import { formatDateRange, formatPrice } from '@/lib/format'
import { partySummary } from '@/lib/labels'
import { ensureSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { remaining, useNow } from '@/lib/time'
import { Gallery } from './Gallery'
import { OfferView, Stars } from './OfferView'
import type { OfferPayload, PublicOffer } from './types'

function Countdown({ expiresAt }: { expiresAt: string | null }) {
  const now = useNow()
  const left = remaining(expiresAt, now)
  const urgent = !!expiresAt && new Date(expiresAt).getTime() - now < 3_600_000
  if (!left) return null
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold shadow-lift backdrop-blur',
        urgent ? 'bg-coral-500/90 text-white' : 'bg-sun-300/90 text-ocean-950',
      )}
      role="timer"
      aria-label="זמן שנשאר להצעה"
    >
      <Clock className="size-4" />
      בתוקף עוד <span className="tabular" dir="ltr">{left}</span>
    </span>
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

  if (isPending) return <Loading />
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

  return (
    <div className="pb-48 md:pb-40">
      <div className="mx-auto max-w-3xl md:px-8 md:pt-4">
        <div className="relative">
          <Gallery key={offer.id} images={offer.images} alt={offer.hotel_name} />
          {!booked && (
            <div className="absolute top-3 end-3">
              <Countdown expiresAt={offer.expires_at} />
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-6 max-w-3xl rounded-t-sheet bg-lagoon-50 px-4 pt-6 md:mt-0 md:px-8">
        <p className="mb-4 text-ink-soft">
          {data.request.first_name ? `${data.request.first_name}, ` : ''}זו ההצעה שהצוות מצא לכם ל{data.request.destination}
        </p>

        {options.length > 1 && (
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-white p-1 ring-1 ring-lagoon-200" role="tablist" aria-label="בחירת מלון">
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
            <h2 className="text-lg font-bold text-coral-600">ההצעה פגה</h2>
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
          <OfferView offer={offer} guests={guests} />
        </div>

        {!isAlternative && data.alternatives[0] && (
          <button
            type="button"
            onClick={() => {
              setSelectedId(data.alternatives[0]!.id)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="mt-6 flex w-full items-center gap-4 rounded-sheet bg-white p-4 text-start ring-1 ring-lagoon-200 transition hover:ring-turquoise-400"
          >
            <span className="flex-1">
              <span className="block text-sm text-ink-soft">יש לנו גם חלופה</span>
              <span className="block font-semibold">{data.alternatives[0].hotel_name}</span>
              <Stars count={data.alternatives[0].stars} />
            </span>
            <span className="tabular text-lg font-bold text-ocean-900">{formatPrice(data.alternatives[0].price_ils)}</span>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 rounded-t-sheet px-4 pt-3">
        <div className="mx-auto max-w-3xl md:px-4">
          {book.error && (
            <p role="alert" className="mb-2 rounded-field bg-coral-500/10 px-3 py-2 text-sm text-coral-600">
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
              <span className="tabular font-normal opacity-90">{formatPrice(offer.price_ils)}</span>
            </button>
          )}
          {/* Icon over label: both secondary actions fit side by side on a 360px phone. */}
          <div className="mt-1.5 grid grid-cols-2 gap-2 pb-1">
            <a
              href={whatsappLink(priceMessage)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-0.5 rounded-field py-1.5 text-sm font-medium text-ocean-800 transition hover:bg-lagoon-100"
            >
              <WhatsAppIcon className="size-5 text-[#1fa855]" />
              המחיר לא מתאים לי
            </a>
            <button
              type="button"
              onClick={() => void share()}
              className="flex flex-col items-center gap-0.5 rounded-field py-1.5 text-sm font-medium text-ocean-800 transition hover:bg-lagoon-100"
            >
              <Share2 className="size-5" />
              לשתף את מי שטס איתכם
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
