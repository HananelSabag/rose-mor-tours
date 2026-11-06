import clsx from 'clsx'
import { Link, useLocation } from 'react-router'
import { NAV_ITEMS } from '@/app/nav'

/** Phone tab bar: full width, hairline on top, a lagoon pill behind the active icon. */
export function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav aria-label="ניווט ראשי" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-lagoon-200 bg-white/95 backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map(({ to, short, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                className="flex flex-col items-center gap-1 pt-2 pb-1 text-xs transition-colors active:scale-95"
              >
                <span className={clsx('grid h-8 w-16 place-items-center rounded-full transition-colors duration-200', active ? 'bg-lagoon-100 text-ocean-800' : 'text-ink-faint')}>
                  <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                </span>
                <span className={clsx(active ? 'font-semibold text-ocean-900' : 'font-medium text-ink-faint')}>{short}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
