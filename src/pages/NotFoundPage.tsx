import { Compass } from 'lucide-react'
import { EmptyState, Page } from '@/components/Page'

export function NotFoundPage() {
  return (
    <>
      <Page className="pt-16">
        <EmptyState icon={Compass} title="הדף הזה לא קיים" body="אולי הקישור השתנה." action={{ to: '/', label: 'לדף הבית' }} />
      </Page>
    </>
  )
}
