import { Check, SearchX } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { Card, EmptyState, Loading, Page, PageTitle } from '@/components/Page'
import { buttonClass } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { whatsappLink } from '@/lib/business'
import { formatDateRange, formatPhone } from '@/lib/format'
import { useRequest } from './queries'
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
