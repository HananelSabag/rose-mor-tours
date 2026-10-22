import { Compass } from 'lucide-react'
import { EmptyState, Page } from '@/components/Page'

export function NotFoundPage() {
  return (
    <Page className="pt-10">
      <EmptyState icon={Compass} title="הדף הזה לא קיים" body="אולי הקישור השתנה. אפשר להתחיל מחדש מהשאלון." action={{ to: '/', label: 'לדף הבית' }} />
    </Page>
  )
}
