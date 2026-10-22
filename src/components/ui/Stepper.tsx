import { Minus, Plus } from 'lucide-react'

type Props = {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export function Stepper({ label, hint, value, min, max, onChange }: Props) {
  const btn =
    'grid size-11 place-items-center rounded-full bg-white text-ocean-800 ring-1 ring-lagoon-200 transition ' +
    'hover:ring-turquoise-400 active:scale-95 disabled:opacity-35 disabled:pointer-events-none'
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-lg font-semibold">{label}</div>
        {hint && <div className="text-sm text-ink-soft">{hint}</div>}
      </div>
      <div className="flex items-center gap-3" role="group" aria-label={label}>
        <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`הוספת ${label}`}>
          <Plus className="size-5" />
        </button>
        <output className="tabular w-7 text-center text-xl font-semibold" aria-live="polite">
          {value}
        </output>
        <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`הורדת ${label}`}>
          <Minus className="size-5" />
        </button>
      </div>
    </div>
  )
}
