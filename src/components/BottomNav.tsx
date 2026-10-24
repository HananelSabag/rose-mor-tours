import clsx from 'clsx'
import { Link, useLocation } from 'react-router'
import { NAV_ITEMS } from '@/app/nav'

export function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav aria-label="ניווט ראשי" className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 rounded-t-dock md:hidden">
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'relative flex flex-col items-center gap-1 pb-1.5 pt-3 text-[0.78rem] font-medium transition-colors',
                  active ? 'text-ocean-800' : 'text-ink-faint hover:text-ink-soft',
                )}
              >
                {active && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-turquoise-500" />}
                <Icon className="size-6" strokeWidth={active ? 2.3 : 1.8} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
