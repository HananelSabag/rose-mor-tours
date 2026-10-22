import { Check, ChevronLeft, SearchX, Sparkles } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { Card, EmptyState, Loading, Page, PageTitle } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { whatsappLink } from '@/lib/business'
import { formatDateRange, formatPhone, formatPrice } from '@/lib/format'
import { liveOffer, useRequest } from './queries'
import { RequestSummary } from './RequestSummary'
import { StatusTrack } from './StatusTrack'

export function RequestPage() {
  const { id } = useParams()
  const location = useLocation()
  const justSent = (location.state as { justSent?: boolean } | null)?.justSent === true
  const { data: request, isPending, sessionReady, signedIn } = useRequest(id)

  if (!sessionReady || (signedIn && isPending)) return <Loading />

  if (!request) {
    return (
      <Page>
        <EmptyState
          icon={SearchX}
          title="לא מצאנו את הבקשה הזאת"
          body="אולי היא נשלחה ממכשיר אחר. אפשר לכתוב לנו בוואטסאפ ונבדוק."
          action={{ to: '/offers', label: 'לבקשות שלי' }}
        />
      </Page>
    )
  }

  const dates = formatDateRange(request.check_in, request.check_out)
  const offer = liveOffer(request)
  const waText = `היי, אני ${request.contact_name}. שלחתי בקשה למלון ב${request.destination} (${dates}).`

  return (
    <Page>
      {justSent ? (
        <div className="animate-rise mb-8 flex flex-col items-start gap-4">
          <span className="grid size-16 place-items-center rounded-full bg-linear-to-b from-sun-300 to-coral-500 text-white shadow-cta">
            <Check className="size-9" strokeWidth={3} />
          </span>
          <PageTitle
            title="קיבלנו את הבקשה"
            subtitle={`הצוות כבר מחפש. ההצעה תגיע לוואטסאפ במספר ${formatPhone(request.contact_phone)} בשעות הקרובות.`}
          />
        </div>
      ) : (
        <PageTitle title={`הבקשה ל${request.destination}`} subtitle={dates} />
      )}

      {offer && (
        <Link
          to={`/o/${offer.public_token}`}
          className="mb-6 flex items-center gap-4 rounded-sheet bg-linear-to-l from-sun-100 to-white p-5 shadow-lift ring-1 ring-sun-300/70 transition hover:ring-coral-500"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-coral-500 text-white">
            <Sparkles className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-ocean-950">{offer.status === 'accepted' ? 'ההצעה שהזמנתם' : 'ההצעה שלכם מוכנה'}</span>
            <span className="block truncate text-ink-soft">
              {offer.hotel_name}, <span className="tabular">{formatPrice(offer.price_ils)}</span>
            </span>
          </span>
          <ChevronLeft className="size-6 shrink-0 text-ocean-700" />
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <h2 className="mb-5 text-lg font-semibold">איפה זה עומד</h2>
          <StatusTrack status={request.status} />
        </Card>
        <Card>
          <h2 className="mb-1 text-lg font-semibold">מה ביקשתם</h2>
          <RequestSummary request={request} />
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a href={whatsappLink(waText)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'lg', 'sm:flex-1')}>
          <WhatsAppIcon />
          שאלה על הבקשה? כתבו לנו
        </a>
        <Link to="/search" className={buttonClass('secondary', 'lg', 'sm:flex-1')}>
          בקשה חדשה
        </Link>
      </div>
    </Page>
  )
}
