import clsx from 'clsx'
import { MapPin, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { destinationLabel, searchDestinations } from '@/data/destinations'

type Props = {
  value: string
  onChange: (value: string) => void
  /** Called when a suggestion is chosen (click or Enter on a highlighted option). */
  onPick: (label: string) => void
  autoFocus?: boolean
  inputClassName?: string
}

/** Destination autocomplete. Free text is allowed: not every island is on our list. */
export function DestinationCombobox({ value, onChange, onPick, autoFocus, inputClassName }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const options = useMemo(() => searchDestinations(value), [value])
  const showList = open && options.length > 0

  function pick(index: number) {
    const option = options[index]
    if (!option) return
    const label = destinationLabel(option)
    onChange(label)
    setOpen(false)
    setActive(-1)
    onPick(label)
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        יעד
      </label>
      <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ocean-700" />
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        enterKeyHint="next"
        autoFocus={autoFocus}
        placeholder="עיר, אי או מדינה"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, options.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, -1))
          } else if (e.key === 'Enter' && showList && active >= 0) {
            e.preventDefault()
            pick(active)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className={clsx(
          'h-14 w-full rounded-field bg-white ps-12 pe-4 text-lg ring-1 ring-lagoon-200 transition outline-none',
          'placeholder:text-ink-faint focus:ring-2 focus:ring-ocean-700',
          inputClassName,
        )}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="יעדים מוצעים"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-field bg-white py-2 shadow-lift ring-1 ring-lagoon-200"
        >
          {options.map((option, index) => (
            <li
              key={`${option.name}-${option.country}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // mousedown, not click: the input's blur would close the list first
              onMouseDown={(e) => {
                e.preventDefault()
                pick(index)
              }}
              onMouseEnter={() => setActive(index)}
              className={clsx(
                'flex cursor-pointer items-center gap-3 px-4 py-3',
                index === active && 'bg-lagoon-100',
              )}
            >
              <MapPin className="size-5 shrink-0 text-turquoise-500" />
              <span className="flex-1">
                <span className="font-semibold">{option.name}</span>
                {option.name !== option.country && <span className="text-ink-soft">, {option.country}</span>}
              </span>
              <span className="text-sm text-ink-faint" dir="ltr">
                {option.en}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
