import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ExternalLink, Eye, EyeOff, Pencil, Phone, Plus, RefreshCw, Send, Ticket, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Card, Loading, Pill } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { RequestSummary } from '@/features/requests/RequestSummary'
import { Stars } from '@/features/offer/OfferView'
import { formatPhone, formatPrice } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { remaining, timeAgo, useNow } from '@/lib/time'
import type { RequestStatus } from '@/lib/types'
import { ADMIN_REQUEST_STATUS } from './labels'
import { offerState, useAdminRequest, type AdminRequest } from './queries'
import { customerWhatsapp, firstName, offerLink, offerMessage } from './whatsapp'

type AdminOffer = AdminRequest['offers'][number]

const REQUEST_TONE: Record<RequestStatus, 'lagoon' | 'sun' | 'coral' | 'ocean' | 'muted'> = {
  new: 'coral',
  in_progress: 'sun',
  offered: 'lagoon',
  closed: 'ocean',
  cancelled: 'muted',
}

function OfferCard({ request, offer, alternatives }: { request: AdminRequest; offer: AdminOffer; alternatives: AdminOffer[] }) {
  const now = useNow()
  const queryClient = useQueryClient()
  const state = offerState(offer, now)
  const left = offer.status === 'sent' ? remaining(offer.expires_at, now) : null
  const booking = [offer, ...alternatives].flatMap((o) => o.bookings).find((b) => b.status !== 'cancelled')

  const update = useMutation({
    mutationFn: async (patch: { status?: 'sent' | 'withdrawn'; sent_at?: null }) => {
      const { error } = await supabase.from('offers').update(patch).eq('id', offer.id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })

  const message = offerMessage({
    firstName: firstName(request.contact_name),
    destination: request.destination,
    hotelName: offer.hotel_name,
    stars: offer.stars,
    checkIn: offer.check_in,
    checkOut: offer.check_out,
    price: offer.price_ils,
    token: offer.public_token,
    hasAlternative: alternatives.length > 0,
  })
  const waHref = customerWhatsapp(request.contact_phone, message)
  const live = offer.status === 'sent' || offer.status === 'accepted'

  return (
    <article className="rounded-sheet bg-white p-5 ring-1 ring-lagoon-200">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={state.tone}>{state.label}</Pill>
        {offer.status === 'sent' &&
          (offer.first_viewed_at ? (
            <span className="inline-flex items-center gap-1 text-sm text-ocean-700">
              <Eye className="size-4" /> נצפתה {timeAgo(offer.first_viewed_at, now)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-ink-faint">
              <EyeOff className="size-4" /> עוד לא נצפתה
            </span>
          ))}
        {left && (
          <span className="tabular ms-auto text-sm text-ink-soft" dir="ltr">
            {left}
          </span>
        )}
      </div>

      <ul className="mt-4 divide-y divide-lagoon-200">
        {[offer, ...alternatives].map((o, i) => (
          <li key={o.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                {o.hotel_name} <Stars count={o.stars} />
                {i > 0 && <span className="rounded-full bg-lagoon-100 px-2 py-0.5 text-xs font-medium text-ocean-800">חלופה</span>}
              </div>
              <div className="text-sm text-ink-soft">
                {o.city}, {o.room_type}
              </div>
            </div>
            <div className="text-end">
              <div className="tabular text-lg font-bold text-ocean-900">{formatPrice(o.price_ils)}</div>
              {o.market_price_ils && <s className="tabular text-sm text-ink-faint">{formatPrice(o.market_price_ils)}</s>}
            </div>
          </li>
        ))}
      </ul>

      {booking && (
        <Link to={`/admin/bookings/${booking.id}`} className={buttonClass('primary', 'md', 'mt-2 w-full')}>
          <Ticket className="size-5" /> להזמנה
        </Link>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {offer.status === 'draft' && (
          <a href={waHref} target="_blank" rel="noreferrer" onClick={() => update.mutate({ status: 'sent' })} className={buttonClass('whatsapp', 'md')}>
            <Send className="size-4" /> שליחה בוואטסאפ
          </a>
        )}
        {offer.status === 'sent' && (
          <>
            <a href={waHref} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
              <WhatsAppIcon /> שליחה שוב
            </a>
            <button type="button" onClick={() => update.mutate({ sent_at: null })} disabled={update.isPending} className={buttonClass('secondary', 'md')}>
              <RefreshCw className="size-4" /> עוד 24 שעות
            </button>
          </>
        )}
        {(offer.status === 'draft' || offer.status === 'sent') && !booking && (
          <Link to={`/admin/offers/${offer.id}`} className={buttonClass('secondary', 'md')}>
            <Pencil className="size-4" /> עריכה
          </Link>
        )}
        {live && (
          <a href={offerLink(offer.public_token)} target="_blank" rel="noreferrer" className={buttonClass('ghost', 'md')}>
            <ExternalLink className="size-4" /> כמו שהלקוח רואה
          </a>
        )}
        {(offer.status === 'draft' || offer.status === 'sent') && !booking && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('לבטל את ההצעה? הקישור ללקוח יפסיק לעבוד.')) update.mutate({ status: 'withdrawn' })
            }}
            className={buttonClass('ghost', 'md', 'text-coral-700 hover:bg-coral-500/10')}
          >
            <XCircle className="size-4" /> ביטול
          </button>
        )}
      </div>
      {update.isError && <p role="alert" className="mt-2 text-sm text-coral-700">הפעולה נכשלה. נסו שוב.</p>}
    </article>
  )
}

export function AdminRequestPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { data: request, isPending } = useAdminRequest(id)

  const setStatus = useMutation({
    mutationFn: async (status: RequestStatus) => {
      const { error } = await supabase.from('quote_requests').update({ status }).eq('id', id!)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })

  if (isPending) return <Loading />
  if (!request) return <p className="py-10 text-center text-ink-soft">הבקשה לא נמצאה.</p>

  const roots = request.offers.filter((o) => !o.parent_offer_id).reverse()
  const hasActiveOffer = roots.some((o) => o.status === 'draft' || o.status === 'sent' || o.status === 'accepted')
  const greeting = `היי ${firstName(request.contact_name)}, כאן מ־Rose&Mor. קיבלנו את הבקשה שלכם ל${request.destination}.`

  return (
    <div>
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1.5 font-medium text-ocean-700 hover:underline">
        <ArrowRight className="size-4" /> לכל הבקשות
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-ocean-950">{request.contact_name}</h1>
            <Pill tone={REQUEST_TONE[request.status]}>{ADMIN_REQUEST_STATUS[request.status]}</Pill>
          </div>
          <p className="mt-1 text-ink-soft">נשלחה {timeAgo(request.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={customerWhatsapp(request.contact_phone, greeting)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md')}>
            <WhatsAppIcon /> וואטסאפ
          </a>
          <a href={`tel:${request.contact_phone}`} className={buttonClass('secondary', 'md')}>
            <Phone className="size-4" />
            <span dir="ltr">{formatPhone(request.contact_phone)}</span>
          </a>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
        <Card>
          <h2 className="mb-1 text-lg font-semibold">מה ביקשו</h2>
          <RequestSummary request={request} />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-lagoon-200 pt-4">
            {request.status === 'new' && (
              <button type="button" onClick={() => setStatus.mutate('in_progress')} className={buttonClass('secondary', 'md')}>
                התחלתי לטפל
              </button>
            )}
            {request.status !== 'cancelled' && request.status !== 'closed' && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('לסמן את הבקשה כמבוטלת?')) setStatus.mutate('cancelled')
                }}
                className={buttonClass('ghost', 'md', 'text-coral-700 hover:bg-coral-500/10')}
              >
                ביטול הבקשה
              </button>
            )}
            {(request.status === 'cancelled' || request.status === 'closed') && (
              <button type="button" onClick={() => setStatus.mutate('in_progress')} className={buttonClass('secondary', 'md')}>
                החזרה לטיפול
              </button>
            )}
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">הצעות</h2>
            {roots.length > 0 && !hasActiveOffer && (
              <Link to={`/admin/requests/${request.id}/offer`} className={buttonClass('primary', 'md')}>
                <Plus className="size-4" /> הצעה חדשה
              </Link>
            )}
          </div>
          {roots.length === 0 ? (
            <div className="rounded-sheet border-2 border-dashed border-lagoon-200 p-8 text-center">
              <p className="mb-4 text-ink-soft">עוד אין הצעה לבקשה הזאת.</p>
              <Link to={`/admin/requests/${request.id}/offer`} className={buttonClass('primary', 'lg')}>
                <Plus className="size-5" /> בניית הצעה
              </Link>
            </div>
          ) : (
            roots.map((root) => (
              <OfferCard key={root.id} request={request} offer={root} alternatives={request.offers.filter((o) => o.parent_offer_id === root.id)} />
            ))
          )}
        </section>
      </div>
    </div>
  )
}
