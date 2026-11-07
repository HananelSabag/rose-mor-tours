import { Check, ChevronLeft, SearchX, Sparkles } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { AppBar } from '@/components/AppBar'
import { InstallHint } from '@/components/InstallHint'
import { Card, EmptyState, Loading, Page } from '@/components/Page'
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

  if (!sessionReady || (signedIn && isPending)) {
    return (
      <>
        <AppBar title="הבקשה" back="/offers" />
        <Loading />
      </>
    )
  }

  if (!request) {
    return (
      <>
        <AppBar title="הבקשה" back="/offers" />
        <Page>
          <EmptyState
            icon={SearchX}
            title="לא מצאנו את הבקשה הזאת"
            body="אולי היא נשלחה ממכשיר אחר. כתבו לנו ונבדוק."
            action={{ href: whatsappLink('היי, אני לא מוצא את הבקשה ששלחתי באפליקציה'), label: 'כתבו לנו בוואטסאפ' }}
          />
        </Page>
      </>
    )
  }

  const dates = formatDateRange(request.check_in, request.check_out)
  const offer = liveOffer(request)
  const waText = `היי, אני ${request.contact_name}. שלחתי בקשה למלון ב${request.destination} (${dates}).`

  return (
    <>
      <AppBar title={justSent ? 'קיבלנו את הבקשה' : request.destination} subtitle={justSent ? undefined : dates} back="/offers" />
      <Page className="space-y-4">
        {justSent && (
          <section className="animate-rise flex items-start gap-4 rounded-sheet bg-white p-4 shadow-lift">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-turquoise-500 text-white">
              <Check className="size-6" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold text-ocean-950">הבקשה אצל הצוות</h2>
              <p className="mt-0.5 text-[15px] text-ink-soft">
                ההצעה תגיע לוואטסאפ במספר <span dir="ltr">{formatPhone(request.contact_phone)}</span>, וגם לכאן.
              </p>
            </div>
          </section>
        )}

        {offer && (
          <Link to={`/o/${offer.public_token}`} className="flex items-center gap-3.5 rounded-sheet bg-sun-100 p-4 text-sun-ink shadow-lift transition active:scale-[0.99]">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-coral-600 text-white">
              <Sparkles className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold text-ocean-950">{offer.status === 'accepted' ? 'ההצעה שהזמנתם' : 'ההצעה שלכם מוכנה'}</span>
              <span className="block truncate text-[15px]">
                {offer.hotel_name}, <span className="tabular">{formatPrice(offer.price_ils)}</span>
              </span>
            </span>
            <ChevronLeft className="size-5 shrink-0" />
          </Link>
        )}

        <div className={justSent ? '' : 'grid gap-4 lg:grid-cols-[1fr_1.3fr]'}>
          {!justSent && (
            <Card>
              <h2 className="mb-4 text-[17px] font-semibold text-ocean-950">איפה זה עומד</h2>
              <StatusTrack status={request.status} />
            </Card>
          )}
          <Card>
            <h2 className="mb-1 text-[17px] font-semibold text-ocean-950">מה ביקשתם</h2>
            <RequestSummary request={request} />
          </Card>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <a href={whatsappLink(waText)} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md', 'sm:flex-1')}>
            <WhatsAppIcon />
            שאלה על הבקשה
          </a>
          {!justSent && (
            <Link to="/search" className={buttonClass('secondary', 'md', 'sm:flex-1')}>
              בקשה חדשה
            </Link>
          )}
        </div>

        {justSent && <InstallHint />}
      </Page>
    </>
  )
}
