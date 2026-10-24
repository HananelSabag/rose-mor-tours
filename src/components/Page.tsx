import clsx from 'clsx'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonClass } from './ui/button'

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mx-auto w-full max-w-3xl px-4 pt-2 md:px-8 md:pt-6', className)}>{children}</div>
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[2rem] leading-tight font-bold text-ocean-950 md:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-prose text-lg text-ink-soft">{subtitle}</p>}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('rounded-sheet bg-white p-5 shadow-lift md:p-6', className)}>{children}</section>
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
        <li key={i} className="rounded-sheet bg-white p-5 shadow-lift">
          <div className="skeleton mb-3 h-7 w-24 rounded-full!" />
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton mt-2 h-4 w-2/3" />
        </li>
      ))}
    </ul>
  )
}

type EmptyProps = {
  icon: LucideIcon
  title: string
  body: string
  action?: { to: string; label: string }
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center rounded-sheet border-2 border-dashed border-lagoon-200 px-6 py-12 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-lagoon-100 text-ocean-700">
        <Icon className="size-8" strokeWidth={1.6} />
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-ink-soft">{body}</p>
      {action && (
        <Link to={action.to} className={buttonClass('primary', 'md', 'mt-6')}>
          {action.label}
        </Link>
      )}
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
  return <span className={clsx('inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold', PILL_TONES[tone])}>{children}</span>
}
