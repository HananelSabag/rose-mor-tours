import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Logo } from '@/components/Logo'
import { Loading } from '@/components/Page'
import { useStaff } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const NAV = [
  { to: '/admin', label: 'בקשות', match: (p: string) => p === '/admin' || p.startsWith('/admin/requests') || p.startsWith('/admin/offers') },
  { to: '/admin/bookings', label: 'הזמנות', match: (p: string) => p.startsWith('/admin/bookings') },
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

export function AdminLayout() {
  const { ready, isStaff, email } = useStaff()
  const { pathname } = useLocation()
  useAdminRealtime(isStaff)

  if (!ready) return <Loading />
  if (!isStaff) return <Navigate to="/admin/login" replace />

  return (
    <div className="min-h-dvh bg-lagoon-50">
      <header className="sticky top-0 z-30 bg-ocean-900 text-white shadow-lift">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-8">
          <Link to="/admin" className="flex items-center gap-3 rounded-xl" aria-label="לתיבת הבקשות">
            <Logo tone="light" />
            <span className="hidden rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-medium sm:inline">ניהול</span>
          </Link>
          <nav aria-label="ניהול" className="flex-1">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => {
                const active = item.match(pathname)
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={clsx('block rounded-full px-4 py-2 font-medium transition', active ? 'bg-white text-ocean-900' : 'text-white/85 hover:bg-white/10')}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <span className="hidden text-sm text-white/70 md:inline" dir="ltr">
            {email}
          </span>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="grid size-10 place-items-center rounded-full text-white/85 hover:bg-white/10"
            aria-label="התנתקות"
            title="התנתקות"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}
