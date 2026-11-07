import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'whatsapp' | 'ghost'
type Size = 'lg' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition select-none ' +
  'active:translate-y-px disabled:pointer-events-none disabled:shadow-none'

const variants: Record<Variant, string> = {
  primary: 'bg-coral-600 text-white shadow-cta hover:bg-coral-700 disabled:bg-lagoon-200 disabled:text-ocean-900/45',
  secondary: 'bg-white text-ocean-800 ring-1 ring-lagoon-200 hover:bg-lagoon-50 disabled:opacity-50',
  whatsapp: 'bg-whatsapp text-whatsapp-ink hover:bg-whatsapp-hover disabled:opacity-50',
  ghost: 'text-ocean-700 hover:bg-lagoon-100 disabled:opacity-50',
}

const sizes: Record<Size, string> = {
  lg: 'h-13 px-6 text-[17px]',
  md: 'h-11 px-5 text-[15px]',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'lg', className?: string) {
  return clsx(base, variants[variant], sizes[size], className)
}
