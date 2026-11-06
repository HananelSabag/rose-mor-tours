import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { NAV_ITEMS } from '@/app/nav'
import { BUSINESS, whatsappLink } from '@/lib/business'
import { Logo } from './Logo'
import { WhatsAppIcon } from './ui/WhatsAppIcon'

/** The page marks where its photo ends with this id; the overlay header turns solid once it passes. */
export const HERO_END_ID = 'hero-end'
const HEADER_HEIGHT = 64

function usePastHero(enabled: boolean) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = enabled ? document.getElementById(HERO_END_ID) : null
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setPast(entry!.boundingClientRect.top < HEADER_HEIGHT), {
      rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px`,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [enabled])
  return past
}

/**
 * Over the home photo the header is transparent with light content, and turns to frosted glass
 * once the photo has scrolled under it. Elsewhere it is a plain bar (desktop only, except offers).
 */
export function SiteHeader({ overlay = false, className }: { overlay?: boolean; className?: string }) {
  const { pathname } = useLocation()
  const solid = usePastHero(overlay)
  const onPhoto = overlay && !solid

  return (
    <header
      className={clsx(
        'z-30',
        overlay ? 'fixed inset-x-0 top-0 border-b transition-[background-color,border-color] duration-300' : 'relative',
        overlay && (solid ? 'border-lagoon-200/80 bg-white/85 backdrop-blur-xl' : 'border-transparent'),
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-18 md:px-8">
        <Link to="/" aria-label={`${BUSINESS.name}, לדף הבית`} className="rounded-xl">
          <Logo tone={onPhoto ? 'light' : 'ink'} />
        </Link>

        <nav aria-label="ניווט ראשי" className="hidden md:block">
          <ul className={clsx('flex items-center gap-1 rounded-full p-1 backdrop-blur', onPhoto ? 'bg-white/15 ring-1 ring-white/25' : 'bg-white/70 ring-1 ring-lagoon-200/70')}>
            {NAV_ITEMS.map(({ to, label, match }) => {
              const active = match(pathname)
              return (
                <li key={to}>
                  <Link
                    to={to}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'block rounded-full px-4 py-2 text-[15px] font-medium transition',
                      active ? (onPhoto ? 'bg-white text-ocean-950' : 'bg-ocean-800 text-white') : onPhoto ? 'text-white hover:bg-white/15' : 'text-ocean-900 hover:bg-white',
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
          className={clsx(
            'inline-flex size-11 items-center justify-center gap-2 rounded-full text-[15px] font-semibold backdrop-blur transition md:h-10 md:w-auto md:px-4',
            onPhoto ? 'bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25' : 'bg-white/80 text-ocean-900 ring-1 ring-lagoon-200/70 hover:bg-white',
          )}
        >
          <WhatsAppIcon className={clsx('size-5', !onPhoto && 'text-whatsapp-mark')} />
          <span className="hidden md:inline">דברו איתנו</span>
          <span className="sr-only md:hidden">דברו איתנו בוואטסאפ</span>
        </a>
      </div>
    </header>
  )
}
