import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'

/**
 * Desktop: the list stays on the start side and the open item fills the rest, like a mail app,
 * so staff move between requests without losing their place. Phones: one screen at a time.
 */
export function SplitView({ list, open }: { list: ReactNode; open: boolean }) {
  return (
    <div className="lg:grid lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
      <div className={clsx('lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pb-2', open && 'hidden lg:block')}>{list}</div>
      <div className={clsx('min-w-0', !open && 'hidden lg:block')}>
        <Outlet />
      </div>
    </div>
  )
}

/** Desktop placeholder in the detail pane until something is picked. */
export function PickPrompt({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center rounded-sheet border border-lagoon-200 bg-white/60">
      <div className="text-center text-ink-soft">
        <Icon className="mx-auto mb-3 size-10 text-turquoise-300" strokeWidth={1.5} />
        <p className="text-[15px]">{text}</p>
      </div>
    </div>
  )
}
