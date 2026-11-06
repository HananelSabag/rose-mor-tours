import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ExternalLink, Inbox, LogOut, Ticket, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Loading } from '@/components/Page'
import { useStaff } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type NavItem = { to: string; label: string; icon: LucideIcon; match: (p: string) => boolean; badge?: 'requests' | 'bookings' }

const NAV: NavItem[] = [
  { to: '/admin', label: 'בקשות', icon: Inbox, badge: 'requests', match: (p) => p === '/admin' || p.startsWith('/admin/requests') || p.startsWith('/admin/offers') },
  { to: '/admin/bookings', label: 'הזמנות', icon: Ticket, badge: 'bookings', match: (p) => p.startsWith('/admin/bookings') },
  { to: '/admin/team', label: 'צוות', icon: Users, match: (p) => p.startsWith('/admin/team') },
]

/** Live updates: any change to requests, bookings or passports refreshes the admin views. */
function useAdminRealtime(enabled: boolean) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    const channel = supabase.channel('admin-live')
    for (const table of ['quote_requests', 'bookings', 'travelers']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin'] })
      })
    }
    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient])
}

/** What needs a human right now: new requests, and bookings waiting on payment or a voucher. */
function useAttention(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'attention'],
    enabled,
    queryFn: async () => {
      const [requests, bookings] = await Promise.all([
        supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['awaiting_payment', 'paid']),
      ])
      return { requests: requests.count ?? 0, bookings: bookings.count ?? 0 }
    },
  })
}

function Badge({ count, className }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span className={clsx('tabular grid h-5 min-w-5 place-items-center rounded-full bg-coral-600 px-1.5 text-xs font-bold text-white', className)}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function AccountMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="החשבון שלי"
        className="grid size-10 place-items-center rounded-full bg-ocean-800 text-sm font-bold text-white uppercase ring-2 ring-white transition hover:bg-ocean-700"
      >
        {email?.[0] ?? '?'}
      </button>
      {open && (
        <div role="menu" className="animate-rise absolute end-0 top-12 z-40 w-64 rounded-sheet bg-white p-2 shadow-glass ring-1 ring-lagoon-200">
          <p className="truncate px-3 py-2 text-sm text-ink-soft" dir="ltr">
            {email}
          </p>
          <Link role="menuitem" to="/" className="flex items-center gap-3 rounded-field px-3 py-2.5 font-medium hover:bg-lagoon-50">
            <ExternalLink className="size-4 text-ocean-700" /> האתר כמו שלקוחות רואים
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-start font-medium text-coral-700 hover:bg-coral-500/10"
          >
            <LogOut className="size-4" /> התנתקות
          </button>
        </div>
      )}
    </div>
  )
}

export function AdminLayout() {
  const { ready, isStaff, email } = useStaff()
  const { pathname } = useLocation()
  useAdminRealtime(isStaff)
  const attention = useAttention(isStaff)

  if (!ready) return <Loading />
  if (!isStaff) return <Navigate to="/admin/login" replace />

  const current = NAV.find((n) => n.match(pathname)) ?? NAV[0]!
  const countFor = (item: NavItem) => (item.badge ? (attention.data?.[item.badge] ?? 0) : 0)

  return (
    <div className="min-h-dvh bg-lagoon-50 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      {/* Desktop: a fixed side rail on the start (right) edge */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-lagoon-200 bg-white px-4 py-6 lg:flex">
        <Link to="/admin" className="mb-8 flex items-center gap-3 px-2" aria-label="לתיבת הבקשות">
          <img src="/logo.svg" alt="" className="size-10 rounded-xl" width={40} height={40} />
          <span className="leading-tight">
            <span className="block font-extrabold text-ocean-950" dir="ltr">
              Rose&amp;Mor
            </span>
            <span className="block text-sm text-ink-soft">ממשק צוות</span>
          </span>
        </Link>
        <nav aria-label="ניהול" className="flex-1">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = item.match(pathname)
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex items-center gap-3 rounded-field px-3 py-2.5 font-medium transition',
                      active ? 'bg-lagoon-100 text-ocean-900' : 'text-ink-soft hover:bg-lagoon-50 hover:text-ink',
                    )}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.3 : 1.8} />
                    <span className="flex-1">{item.label}</span>
                    <Badge count={countFor(item)} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-3 border-t border-lagoon-200 pt-4">
          <AccountMenu email={email} />
          <span className="min-w-0 truncate text-sm text-ink-soft" dir="ltr">
            {email}
          </span>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phones and tablets: a slim app bar with the section name */}
        <header className="glass sticky top-0 z-30 border-x-0 border-t-0 lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <img src="/logo.svg" alt="" className="size-8 rounded-lg" width={32} height={32} />
            <h1 className="flex-1 text-lg font-bold text-ocean-950">{current.label}</h1>
            <AccountMenu email={email} />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 md:px-8 lg:pt-8 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Phones and tablets: thumb-reach navigation */}
      <nav aria-label="ניהול" className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 rounded-t-dock lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map((item) => {
            const active = item.match(pathname)
            const Icon = item.icon
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'relative flex flex-col items-center gap-1 pt-3 pb-1.5 text-[0.78rem] font-medium transition-colors',
                    active ? 'text-ocean-800' : 'text-ink-faint',
                  )}
                >
                  {active && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-turquoise-500" />}
                  <span className="relative">
                    <Icon className="size-6" strokeWidth={active ? 2.3 : 1.8} />
                    <Badge count={countFor(item)} className="absolute -top-2 -end-3" />
                  </span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <ScrollRestoration />
    </div>
  )
}
