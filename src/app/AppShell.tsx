import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { BottomNav } from '@/components/BottomNav'
import { SiteHeader } from '@/components/SiteHeader'

export function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  // The questionnaire is a focused flow: it brings its own top bar and sticky action.
  const isFlow = pathname.startsWith('/search')

  return (
    <div className="min-h-dvh">
      {!isFlow && <SiteHeader overlay={isHome} />}
      <main className={isFlow ? '' : 'pb-28 md:pb-16'}>
        <Outlet />
      </main>
      {!isFlow && <BottomNav />}
      <ScrollRestoration />
    </div>
  )
}
