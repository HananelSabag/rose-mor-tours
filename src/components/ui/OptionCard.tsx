import clsx from 'clsx'
import { Check } from 'lucide-react'

type Props = {
  selected: boolean
  onSelect: () => void
  title: string
  hint?: string
  /** radio: one of a group; checkbox: independent toggle */
  role?: 'radio' | 'checkbox'
}

/** A choice with a title and an optional hint. Selected = outlined row and a filled check; nothing louder. */
export function OptionCard({ selected, onSelect, title, hint, role = 'radio' }: Props) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        'flex w-full items-center gap-4 rounded-field px-4 py-3.5 text-start transition active:scale-[0.99]',
        selected ? 'bg-lagoon-100 ring-2 ring-ocean-700' : 'bg-white ring-1 ring-lagoon-200 hover:ring-turquoise-400',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-snug font-semibold">{title}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-ink-soft">{hint}</span>}
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
