import clsx from 'clsx'
import type { ReactNode } from 'react'

type Props = {
  selected: boolean
  onToggle: () => void
  children: ReactNode
  /** 'button' = a one-tap shortcut, not a toggle (no checked state is announced). */
  role?: 'radio' | 'checkbox' | 'button'
}

export function Chip({ selected, onToggle, children, role = 'checkbox' }: Props) {
  return (
    <button
      type="button"
      role={role === 'button' ? undefined : role}
      aria-checked={role === 'button' ? undefined : selected}
      onClick={onToggle}
      className={clsx(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-base font-medium transition',
        selected
          ? 'bg-ocean-800 text-white shadow-lift'
          : 'bg-white text-ink ring-1 ring-lagoon-200 hover:ring-turquoise-400',
      )}
    >
      {children}
    </button>
  )
}
