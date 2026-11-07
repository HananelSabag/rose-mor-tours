import clsx from 'clsx'
import { ChevronLeft, LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonClass } from './ui/button'
import { WhatsAppIcon } from './ui/WhatsAppIcon'

/** Content column under an AppBar (which owns the top spacing). */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mx-auto w-full max-w-3xl px-4 md:px-8', className)}>{children}</div>
}

/** Legacy title block for screens without an AppBar (desktop-only views). */
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[1.75rem] leading-[2.125rem] font-bold tracking-[-0.01em] text-ocean-950 md:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-prose text-[15px] text-ink-soft md:text-base">{subtitle}</p>}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('rounded-sheet bg-white p-4 shadow-lift md:p-6', className)}>{children}</section>
}

/** Small heading above a group (iOS grouped-list style). */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={clsx('mb-2 px-1 text-[15px] font-semibold text-ink-soft', className)}>{children}</h2>
}

/** A white group of rows separated by hairlines. */
export function GroupedList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={clsx('divide-y divide-lagoon-100 overflow-hidden rounded-sheet bg-white shadow-lift', className)}>{children}</ul>
}

type RowProps = {
  /** Lucide icon or any icon component that takes className (e.g. WhatsAppIcon) */
  icon: ComponentType<{ className?: string }>
  /** Icon tint; defaults to the ocean accent */
  tone?: 'ocean' | 'whatsapp' | 'coral'
  title: ReactNode
  detail?: ReactNode
  to?: string
  href?: string
  onClick?: () => void
  trailing?: ReactNode
}

const ROW_TONE = {
  ocean: 'bg-lagoon-100 text-ocean-700',
  whatsapp: 'bg-whatsapp/15 text-whatsapp-mark',
  coral: 'bg-coral-500/12 text-coral-700',
}

/** One row of a GroupedList: icon, text, optional detail, chevron when it navigates. */
export function ListRow({ icon: Icon, tone = 'ocean', title, detail, to, href, onClick, trailing }: RowProps) {
  const inner = (
    <>
      <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', ROW_TONE[tone])}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{title}</span>
        {detail && <span className="block truncate text-[13px] text-ink-soft">{detail}</span>}
      </span>
      {trailing ?? ((to || href || onClick) && <ChevronLeft className="size-5 shrink-0 text-ink-faint" />)}
    </>
  )
  const rowClass = 'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start transition-colors'
  const interactive = `${rowClass} hover:bg-lagoon-50 active:bg-lagoon-100`
  return (
    <li>
      {to ? (
        <Link to={to} className={interactive}>
          {inner}
        </Link>
      ) : href ? (
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={interactive}>
          {inner}
        </a>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={interactive}>
          {inner}
        </button>
      ) : (
        <div className={rowClass}>{inner}</div>
      )}
    </li>
  )
}

export function Loading({ label = 'טוען' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-soft" role="status">
      <LoaderCircle className="size-6 animate-spin text-turquoise-500" />
      {label}
    </div>
  )
}

/** Placeholder rows shaped like the list cards they precede. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-3" role="status" aria-label="טוען">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="rounded-sheet bg-white p-4 shadow-lift">
          <div className="flex items-center justify-between gap-3">
            <div className="skeleton h-5 w-2/5" />
            <div className="skeleton h-6 w-20 rounded-full!" />
          </div>
          <div className="skeleton mt-3 h-4 w-3/5" />
          <div className="skeleton mt-2 h-4 w-1/3" />
        </li>
      ))}
    </ul>
  )
}

type EmptyProps = {
  icon: LucideIcon
  title: string
  body: string
  /** `to` for an in-app next step; `href` (a wa.me link) when the way out is talking to the team. */
  action?: { to: string; label: string } | { href: string; label: string }
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-lagoon-100 text-ocean-700">
        <Icon className="size-7" strokeWidth={1.7} />
      </span>
      <h2 className="text-[17px] font-semibold text-ocean-950">{title}</h2>
      <p className="mt-1.5 max-w-xs text-[15px] text-ink-soft">{body}</p>
      {action &&
        ('href' in action ? (
          <a href={action.href} target="_blank" rel="noreferrer" className={buttonClass('whatsapp', 'md', 'mt-6')}>
            <WhatsAppIcon /> {action.label}
          </a>
        ) : (
          <Link to={action.to} className={buttonClass('primary', 'md', 'mt-6')}>
            {action.label}
          </Link>
        ))}
    </div>
  )
}

const PILL_TONES = {
  lagoon: 'bg-lagoon-100 text-ocean-800',
  sun: 'bg-sun-100 text-sun-ink',
  coral: 'bg-coral-500/12 text-coral-700',
  ocean: 'bg-ocean-800 text-white',
  muted: 'bg-ink/5 text-ink-soft',
} as const

export function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return <span className={clsx('inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[13px] font-semibold', PILL_TONES[tone])}>{children}</span>
}
