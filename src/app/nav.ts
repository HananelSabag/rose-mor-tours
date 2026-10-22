import { Inbox, Luggage, Search, UserRound, type LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Paths that also light up this tab */
  match: (pathname: string) => boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'חפש חופשה', icon: Search, match: (p) => p === '/' || p.startsWith('/search') },
  { to: '/offers', label: 'ההצעות שלי', icon: Inbox, match: (p) => p.startsWith('/offers') || p.startsWith('/requests') },
  { to: '/bookings', label: 'ההזמנות שלי', icon: Luggage, match: (p) => p.startsWith('/bookings') },
  { to: '/profile', label: 'פרופיל', icon: UserRound, match: (p) => p.startsWith('/profile') },
]
