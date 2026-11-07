import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { BottomNav } from '@/components/BottomNav'
import { SiteHeader } from '@/components/SiteHeader'

export function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const isOffer = pathname.startsWith('/o/')
  // The questionnaire is a focused flow: it brings its own top bar and sticky action.
  const isFlow = pathname.startsWith('/search')
  // The offer page has its own sticky action bar in place of the tabs.
  const hideNav = isFlow || isOffer

  return (
    <div className="min-h-dvh">
      {/* Phones: inner screens (offer page included) draw their own top bar; the site header is for home and desktop. */}
      {isHome ? <SiteHeader overlay /> : !isFlow && <SiteHeader className="hidden md:block" />}
      <main className={hideNav ? '' : 'pb-24 md:pb-16'}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
      <ScrollRestoration />
    </div>
  )
}
