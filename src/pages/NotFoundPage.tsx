import { Compass } from 'lucide-react'
import { AppBar } from '@/components/AppBar'
import { EmptyState, Page } from '@/components/Page'

export function NotFoundPage() {
  return (
    <>
      <AppBar title="הדף לא נמצא" />
      <Page>
        <EmptyState icon={Compass} title="הדף הזה לא קיים" body="אולי הקישור השתנה. אפשר להתחיל מחדש מהשאלון." action={{ to: '/', label: 'לדף הבית' }} />
      </Page>
    </>
  )
}
