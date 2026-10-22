import clsx from 'clsx'
import { Link, useLocation } from 'react-router'
import { NAV_ITEMS } from '@/app/nav'
import { BUSINESS, whatsappLink } from '@/lib/business'
import { Logo } from './Logo'
import { WhatsAppIcon } from './ui/WhatsAppIcon'

/** Top bar. Over the home hero it is transparent; elsewhere it sits on the lagoon background. */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const { pathname } = useLocation()
  return (
    <header className={clsx('z-20', overlay ? 'absolute inset-x-0 top-0' : 'relative')}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-20 md:px-8">
        <Link to="/" aria-label={`${BUSINESS.name}, לדף הבית`} className="rounded-xl">
          <Logo />
        </Link>

        <nav aria-label="ניווט ראשי" className="hidden md:block">
          <ul className="flex items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-white/80 backdrop-blur">
            {NAV_ITEMS.map(({ to, label, match }) => {
              const active = match(pathname)
              return (
                <li key={to}>
                  <Link
                    to={to}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'block rounded-full px-4 py-2 text-[0.95rem] font-medium transition',
                      active ? 'bg-ocean-800 text-white' : 'text-ocean-900 hover:bg-white',
                    )}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <a
          href={whatsappLink()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white/80 px-3 text-sm font-semibold text-ocean-900 ring-1 ring-white/80 backdrop-blur transition hover:bg-white md:px-4"
        >
          <WhatsAppIcon className="size-5 text-[#1fa855]" />
          <span className="hidden sm:inline">דברו איתנו</span>
          <span className="sr-only sm:hidden">דברו איתנו בוואטסאפ</span>
        </a>
      </div>
    </header>
  )
}
