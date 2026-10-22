import { RotateCcw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { buttonClass } from '@/components/ui/button'
import { NotFoundPage } from './NotFoundPage'

/** Last-resort boundary. A stale lazy chunk after a deploy is the common cause, so offer a reload. */
export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-ocean-950">משהו השתבש בטעינה</h1>
      <p className="mt-2 text-ink-soft">כנראה עדכנו את האתר בזמן שהוא היה פתוח. טעינה מחדש תסדר את זה.</p>
      <button type="button" onClick={() => window.location.reload()} className={buttonClass('primary', 'md', 'mt-6')}>
        <RotateCcw className="size-5" />
        טעינה מחדש
      </button>
    </div>
  )
}
