import clsx from 'clsx'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  selected: boolean
  onSelect: () => void
  title: string
  hint?: string
  icon?: ReactNode
  /** radio: one of a group; checkbox: independent toggle */
  role?: 'radio' | 'checkbox'
}

export function OptionCard({ selected, onSelect, title, hint, icon, role = 'radio' }: Props) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        'flex w-full items-center gap-4 rounded-field border-2 px-4 py-4 text-start transition',
        selected
          ? 'border-ocean-700 bg-lagoon-100 shadow-lift'
          : 'border-transparent bg-white ring-1 ring-lagoon-200 hover:ring-turquoise-400',
      )}
    >
      {icon && (
        <span
          className={clsx(
            'grid size-11 shrink-0 place-items-center rounded-full',
            selected ? 'bg-ocean-700 text-white' : 'bg-lagoon-100 text-ocean-700',
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold leading-snug">{title}</span>
        {hint && <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>}
      </span>
      <span
        className={clsx(
          'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
          selected ? 'border-ocean-700 bg-ocean-700 text-white' : 'border-lagoon-200',
        )}
      >
        {selected && <Check className="size-4" strokeWidth={3} />}
      </span>
    </button>
  )
}
