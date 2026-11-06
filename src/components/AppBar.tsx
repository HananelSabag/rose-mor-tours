import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { whatsappLink } from '@/lib/business'
import { WhatsAppIcon } from './ui/WhatsAppIcon'

type Props = {
  title: string
  subtitle?: string
  /** Parent route for the back button (screens below a tab). */
  back?: string
  /** One trailing action; defaults to WhatsApp, the business's real support channel. */
  action?: ReactNode
}

/** Round icon button sized for the app bar (44px target). */
export function BarButton({ label, children, href, onClick }: { label: string; children: ReactNode; href?: string; onClick?: () => void }) {
  const className = 'grid size-11 place-items-center rounded-full text-ocean-800 transition hover:bg-lagoon-100 active:scale-95'
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={className}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {children}
    </button>
  )
}

export function WhatsAppBarButton() {
  return (
    <BarButton label="דברו איתנו בוואטסאפ" href={whatsappLink()}>
      <WhatsAppIcon className="size-6 text-whatsapp-mark" />
    </BarButton>
  )
}

/**
 * Phone screens get an iOS-style large title that hands over to a compact bar as it scrolls
 * away. From md up the site header carries navigation, so only the large title remains.
 */
export function AppBar({ title, subtitle, back, action = <WhatsAppBarButton /> }: Props) {
  const titleRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    // The compact title appears once the large one has slid under the 52px bar.
    const io = new IntersectionObserver(([entry]) => setCompact(!entry!.isIntersecting), { rootMargin: '-52px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div
        className={clsx(
          'sticky top-0 z-30 border-b transition-[background-color,border-color] duration-200 md:hidden',
          compact ? 'border-lagoon-200 bg-white/90 backdrop-blur-xl' : 'border-transparent bg-lagoon-50',
        )}
      >
        <div className="grid h-13 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1 px-2">
          <div>
            {back && (
              <Link to={back} aria-label="חזרה" className="grid size-11 place-items-center rounded-full text-ocean-800 transition hover:bg-lagoon-100 active:scale-95">
                <ArrowRight className="size-6" />
              </Link>
            )}
          </div>
          <p aria-hidden="true" className={clsx('truncate text-center text-[17px] font-semibold text-ocean-950 transition-opacity duration-200', compact ? 'opacity-100' : 'opacity-0')}>
            {title}
          </p>
          <div className="justify-self-end">{action}</div>
        </div>
      </div>
      <div ref={titleRef} className="mx-auto w-full max-w-3xl px-4 pt-1 pb-5 md:px-8 md:pt-10 md:pb-8">
        <h1 className="text-[1.75rem] leading-[2.125rem] font-bold tracking-[-0.01em] text-ocean-950 md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-soft md:text-base">{subtitle}</p>}
      </div>
    </>
  )
}
