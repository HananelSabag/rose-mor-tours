import clsx from 'clsx'

export function Logo({ tone = 'ink', className }: { tone?: 'ink' | 'light'; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)} dir="ltr">
      <img src="/logo.svg" alt="" className="size-9 rounded-[10px] shadow-lift" width={36} height={36} />
      <span className={clsx('leading-none', tone === 'light' ? 'text-white' : 'text-ocean-950')}>
        <span className="block text-[1.15rem] font-extrabold tracking-tight">Rose&amp;Mor</span>
        <span className={clsx('block text-[0.7rem] font-medium tracking-[0.18em]', tone === 'light' ? 'text-white/80' : 'text-ocean-700')}>
          tours
        </span>
      </span>
    </span>
  )
}
