import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'whatsapp' | 'ghost'
type Size = 'lg' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition select-none ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none'

const variants: Record<Variant, string> = {
  primary: 'bg-coral-500 text-white shadow-cta hover:bg-coral-600',
  secondary: 'bg-white text-ocean-800 ring-1 ring-lagoon-200 hover:bg-lagoon-50',
  whatsapp: 'bg-[#25d366] text-[#05301a] hover:bg-[#1fc15c]',
  ghost: 'text-ocean-700 hover:bg-lagoon-100',
}

const sizes: Record<Size, string> = {
  lg: 'h-14 px-7 text-lg',
  md: 'h-11 px-5 text-base',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'lg', className?: string) {
  return clsx(base, variants[variant], sizes[size], className)
}
